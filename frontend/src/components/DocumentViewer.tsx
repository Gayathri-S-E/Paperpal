import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Layers
} from 'lucide-react';
import type { PageInfo, SentenceExplanation } from '../types';
import { api } from '../services/api';

interface DocumentViewerProps {
  docId: string;
  pages: PageInfo[];
  currentPage: number;
  onPageChange: (page: number) => void;
  activeSentenceId: string | null;
  explainedSentenceIds: Set<string>;
  onSelectSentence: (sentenceId: string) => void;
  explanationsMap: Map<string, SentenceExplanation>;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  docId,
  pages,
  currentPage,
  onPageChange,
  activeSentenceId,
  explainedSentenceIds,
  onSelectSentence,
  explanationsMap,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showAllHighlights, setShowAllHighlights] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const currentPageInfo = pages.find((p) => p.page_number === currentPage);
  const totalPages = pages.length;

  // Auto-scroll to active sentence when changed
  useEffect(() => {
    if (!activeSentenceId || !currentPageInfo) return;
    const activeSentence = currentPageInfo.sentences.find(s => s.sentence_id === activeSentenceId);
    if (activeSentence && activeSentence.bounding_boxes.length > 0 && containerRef.current) {
      const firstBox = activeSentence.bounding_boxes[0];
      const container = containerRef.current;
      const targetScrollY = (firstBox.y * container.scrollHeight) - (container.clientHeight / 3);
      container.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'smooth'
      });
    }
  }, [activeSentenceId, currentPage, currentPageInfo]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.6, Math.min(2.5, Number((prev + delta).toFixed(1)))));
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* Top Toolbar */}
      <div style={{
        padding: '0.6rem 1rem',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        zIndex: 20
      }}>
        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.55rem',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.15s'
            }}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.35rem' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.55rem',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.15s'
            }}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom & Highlight Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAllHighlights((prev) => !prev)}
            style={{
              backgroundColor: showAllHighlights ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: showAllHighlights ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${showAllHighlights ? 'var(--accent-border)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title="Toggle sentence highlight overlays"
          >
            <Layers size={14} />
            <span>Highlights</span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}>
            <button
              onClick={() => handleZoom(-0.15)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 4px', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={resetZoom}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '4px 6px',
                cursor: 'pointer',
                borderLeft: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Reset Zoom"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative'
        }}
      >
        <div style={{
          position: 'relative',
          display: 'inline-block',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease-out',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}>
          {/* Original Page Image */}
          <img
            ref={imageRef}
            src={api.getPageImageUrl(docId, currentPage)}
            alt={`Document Page ${currentPage}`}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />

          {/* Positional Highlight Overlay Layer */}
          {showAllHighlights && currentPageInfo && currentPageInfo.sentences.map((sentence) => {
            const isCurrent = sentence.sentence_id === activeSentenceId;
            const isPlayed = explainedSentenceIds.has(sentence.sentence_id);
            const exp = explanationsMap.get(sentence.sentence_id);
            const isHighImportance = exp?.importance === 'high';

            return sentence.bounding_boxes.map((box, boxIdx) => {
              let highlightClass = '';
              const customStyle: React.CSSProperties = {
                position: 'absolute',
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                borderRadius: '2px',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition: 'all 0.15s ease',
              };

              if (isCurrent) {
                highlightClass = 'highlight-active';
                customStyle.backgroundColor = 'rgba(79, 70, 229, 0.22)';
                customStyle.border = '2px solid #4F46E5';
              } else if (isPlayed) {
                highlightClass = 'highlight-previous';
              } else if (isHighImportance) {
                highlightClass = 'highlight-important';
              } else {
                customStyle.backgroundColor = 'transparent';
                customStyle.border = '1px solid transparent';
              }

              return (
                <div
                  key={`${sentence.sentence_id}_box_${boxIdx}`}
                  className={highlightClass}
                  style={customStyle}
                  onClick={() => onSelectSentence(sentence.sentence_id)}
                  title={`${exp?.category ? `[${exp.category}] ` : ''}${sentence.original_text}`}
                  onMouseOver={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.16)';
                      e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.5)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = isPlayed
                        ? 'rgba(79, 70, 229, 0.08)'
                        : isHighImportance
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'transparent';
                      e.currentTarget.style.borderColor = isPlayed
                        ? 'rgba(79, 70, 229, 0.25)'
                        : isHighImportance
                        ? 'rgba(180, 83, 9, 0.4)'
                        : 'transparent';
                    }
                  }}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};
