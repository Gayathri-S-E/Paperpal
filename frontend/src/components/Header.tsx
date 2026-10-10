import React from 'react';
import { 
  FileText, 
  Volume2, 
  Sparkles, 
  Plus, 
  Cpu
} from 'lucide-react';
import type { DocumentInfo } from '../types';

interface HeaderProps {
  currentDoc: DocumentInfo | null;
  onNewDocument: () => void;
  onGoHome: () => void;
  isAiConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDoc,
  onNewDocument,
  onGoHome,
  isAiConfigured,
}) => {
  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* Brand & Document Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onGoHome}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: 0,
            color: 'inherit',
            textAlign: 'left'
          }}
          title="Back to Home"
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Volume2 size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Paper<span style={{ color: 'var(--accent-primary)' }}>Pal</span>
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-border)',
                letterSpacing: '0.04em'
              }}>
                Voice AI
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              AI Document Voice Assistant
            </p>
          </div>
        </button>

        {currentDoc && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: '0.5rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--border-subtle)',
          }}>
            <FileText size={16} color="var(--accent-primary)" />
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              maxWidth: '220px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--text-primary)'
            }}>
              {currentDoc.title || currentDoc.filename}
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}>
              {currentDoc.total_pages} {currentDoc.total_pages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Engine status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isAiConfigured ? 'var(--color-success-bg)' : 'var(--bg-surface-elevated)',
          border: `1px solid ${isAiConfigured ? 'var(--color-success-border)' : 'var(--border-subtle)'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isAiConfigured ? 'var(--color-success)' : 'var(--text-secondary)'
        }}>
          {isAiConfigured ? <Sparkles size={13} /> : <Cpu size={13} />}
          <span>
            {isAiConfigured 
              ? 'AI Document Assistant' 
              : 'Precision NLP Engine'}
          </span>
        </div>

        <button
          onClick={onNewDocument}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.95rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
        >
          <Plus size={16} />
          <span>{currentDoc ? 'New Document' : 'Upload Document'}</span>
        </button>
      </div>
    </header>
  );
};
