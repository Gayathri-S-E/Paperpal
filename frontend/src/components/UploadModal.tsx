import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  UploadCloud, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  Sparkles,
  SwitchCamera
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  initialMode?: 'upload' | 'camera';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  initialMode = 'upload',
}) => {
  const [mode, setMode] = useState<'upload' | 'camera'>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera state
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, cameraFacing]);

  const startCamera = async () => {
    stopCamera();
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (_err) {
      setErrorMessage(
        'Camera access was denied or is not supported. You can upload an image or PDF document instead.'
      );
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `document_scan_${Date.now()}.png`, { type: 'image/png' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/png', 0.95);
  };

  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setErrorMessage('Unsupported file format. Please choose a PDF, PNG, JPG, or WebP document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit. Please upload a smaller document.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onUpload(selectedFile);
      onClose();
    } catch (err: unknown) {
      console.error('Document processing error:', err);
      const isNetworkOrServerError = err instanceof Error && (err.message.includes('status 5') || err.message.includes('fetch') || err.message.includes('Failed'));
      const message = isNetworkOrServerError
        ? 'AI analysis is temporarily unavailable. Please try again.'
        : (err instanceof Error ? err.message : 'AI analysis is temporarily unavailable. Please try again.');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.15rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {selectedFile ? 'Review Document' : 'Upload Document'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={19} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {!selectedFile ? (
            <div>
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: mode === 'upload' ? 'var(--bg-surface)' : 'transparent',
                    color: mode === 'upload' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    boxShadow: mode === 'upload' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <UploadCloud size={16} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: mode === 'camera' ? 'var(--bg-surface)' : 'transparent',
                    color: mode === 'camera' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    boxShadow: mode === 'camera' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Camera size={16} />
                  <span>Phone / Web Camera</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              {mode === 'upload' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                    backgroundColor: isDragging ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--accent-subtle)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}>
                    <UploadCloud size={22} color="var(--accent-primary)" />
                  </div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                    Click or drag & drop document
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Supports PDF, PNG, JPG, WebP up to 25MB
                  </p>
                </div>
              )}

              {/* Camera Live Stream */}
              {mode === 'camera' && (
                <div style={{
                  position: 'relative',
                  backgroundColor: '#0F172A',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.55rem',
                        cursor: 'pointer'
                      }}
                      title="Flip Camera"
                    >
                      <SwitchCamera size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        width: '52px',
                        height: '52px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                      }}
                      title="Capture Document Page"
                    >
                      <Camera size={22} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Selected File Preview & Confirmation */
            <div>
              <div style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Scan preview"
                    style={{
                      width: '72px',
                      height: '96px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '72px',
                    height: '96px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}>
                    <FileText size={28} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      PDF
                    </span>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    marginBottom: '0.2rem',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {selectedFile.name}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for text extraction
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: '0.45rem'
                    }}
                  >
                    Retake / Choose another
                  </button>
                </div>
              </div>

              {/* Understand Action Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Understanding your document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Understand This Document</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
