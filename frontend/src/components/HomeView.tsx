import React from 'react';
import { 
  Camera, 
  UploadCloud, 
  FileText, 
  Zap, 
  Home as HomeIcon, 
  AlertTriangle, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import type { DocumentInfo } from '../types';

interface HomeViewProps {
  onScanCamera: () => void;
  onUploadFile: () => void;
  onSelectSample: (sampleType: 'utility_bill' | 'lease_agreement' | 'bank_notice') => void;
  recentDocuments: DocumentInfo[];
  onOpenDocument: (docId: string) => void;
  onDeleteDocument: (docId: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onScanCamera,
  onUploadFile,
  onSelectSample,
  recentDocuments,
  onOpenDocument,
  onDeleteDocument,
  isLoading,
}) => {
  return (
    <div style={{
      maxWidth: '1140px',
      margin: '0 auto',
      padding: '2rem 1.5rem 3.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem'
    }}>
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative'
      }}>
        {/* Top Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.9rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          color: 'var(--accent-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}>
          <Sparkles size={14} />
          <span>Synchronized Voice Explanations & Text Highlighting</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2rem, 4.5vw, 2.85rem)',
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          Understand Confusing Documents <br />
          <span style={{ color: 'var(--accent-primary)' }}>
            Explained in Plain English by AI Voice
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          maxWidth: '640px',
          margin: '0 auto 2.25rem auto',
          lineHeight: 1.6
        }}>
          Upload your electricity bills, rental leases, bank notices, or insurance policies. 
          PaperPal extracts exact sentences, explains clauses aloud, and highlights original text in real time.
        </p>

        {/* Primary Actions */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.85rem'
        }}>
          <button
            onClick={onUploadFile}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.8rem 1.6rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
          >
            <UploadCloud size={18} />
            <span>Upload PDF or Image</span>
          </button>

          <button
            onClick={onScanCamera}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '0.8rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            }}
          >
            <Camera size={18} color="var(--accent-primary)" />
            <span>Scan with Camera</span>
          </button>
        </div>

        {/* Trust Points */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1.5rem',
          marginTop: '2.5rem',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={15} color="var(--color-success)" /> No text obscured
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={15} color="var(--color-success)" /> Coordinate sentence overlays
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={15} color="var(--color-success)" /> Grounded Q&A citations
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={15} color="var(--accent-primary)" /> Private server-side processing
          </span>
        </div>
      </section>

      {/* Example Documents Section */}
      <section>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Try an Example Document
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Click any sample below to experience synchronized voice explanations instantly.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Sample 1: Electricity Bill */}
          <div
            onClick={() => onSelectSample('utility_bill')}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xs)',
              padding: '1.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-payment-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-payment-border)'
                }}>
                  <Zap size={20} color="var(--color-payment)" />
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  1 Page Bill
                </span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Electricity Billing Statement
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Features total balance due, late payment charges, usage kWh tariffs, and financial assistance terms.
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent-primary)'
            }}>
              <span>Analyze & Listen</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Sample 2: Residential Lease */}
          <div
            onClick={() => onSelectSample('lease_agreement')}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xs)',
              padding: '1.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--accent-border)'
                }}>
                  <HomeIcon size={20} color="var(--accent-primary)" />
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  2 Page Contract
                </span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Residential Lease Agreement
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Multi-page agreement covering security deposit escrow, 60-day notice, maintenance rules, and pet fees.
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent-primary)'
            }}>
              <span>Analyze & Listen</span>
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Sample 3: Bank Notice */}
          <div
            onClick={() => onSelectSample('bank_notice')}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xs)',
              padding: '1.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-danger-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-danger-border)'
                }}>
                  <AlertTriangle size={20} color="var(--color-danger)" />
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger-border)'
                }}>
                  Urgent Notice
                </span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Bank Overdue & Demand Notice
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Formal demand notice with delinquent balance, collection agency deadlines, and cure instructions.
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--accent-primary)'
            }}>
              <span>Analyze & Listen</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>
      </section>

      {/* Recent Documents Section */}
      {recentDocuments && recentDocuments.length > 0 && (
        <section>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Documents
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Reopen processed documents or replay explanations.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc.id)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-xs)',
                  padding: '1.15rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <FileText size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {doc.title || doc.filename}
                    </span>
                  </div>
                  <button
                    onClick={(e) => onDeleteDocument(doc.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: 'var(--radius-xs)',
                      flexShrink: 0
                    }}
                    title="Delete document"
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <span>{doc.total_pages} {doc.total_pages === 1 ? 'Page' : 'Pages'}</span>
                  <span>•</span>
                  <span>{doc.file_type.toUpperCase()}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
