import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  MessageSquare, 
  ListChecks, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Mic, 
  MicOff, 
  Send, 
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import type { 
  SentenceExplanation, 
  DocumentSummary, 
  ChatMessage, 
  CategoryEnum 
} from '../types';
import { speechService } from '../services/speech';
import type { PlaybackState } from '../services/speech';

interface AssistantPanelProps {
  docId: string;
  explanations: SentenceExplanation[];
  summary: DocumentSummary | null;
  activeSentenceIndex: number;
  onSentenceIndexChange: (index: number) => void;
  explainedSentenceIds: Set<string>;
  onSendMessage: (msg: string) => Promise<void>;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  onJumpToSentence: (page: number, sentenceId: string) => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  explanations,
  summary,
  activeSentenceIndex,
  onSentenceIndexChange,
  explainedSentenceIds,
  onSendMessage,
  chatMessages,
  isChatLoading,
  onJumpToSentence,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'summary' | 'chat'>('voice');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isSilentMode, setIsSilentMode] = useState<boolean>(false);
  const [autoAdvance] = useState<boolean>(true);
  
  // Chat state
  const [chatInput, setChatInput] = useState<string>('');
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  const currentExplanation = explanations[activeSentenceIndex] || null;

  // Sync speech state
  useEffect(() => {
    speechService.onStateChange((state) => {
      setPlaybackState(state);
    });

    speechService.onFinished(() => {
      if (autoAdvance && activeSentenceIndex < explanations.length - 1) {
        onSentenceIndexChange(activeSentenceIndex + 1);
      }
    });

    return () => {
      speechService.stop();
    };
  }, [activeSentenceIndex, explanations.length, autoAdvance, onSentenceIndexChange]);

  // When active sentence changes during playback, speak the new explanation
  useEffect(() => {
    if (currentExplanation && playbackState === 'playing') {
      const textToSpeak = `${currentExplanation.simple_explanation}`;
      speechService.speak(textToSpeak);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSentenceIndex]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Playback Control Handlers
  const handlePlayToggle = () => {
    if (playbackState === 'playing') {
      speechService.pause();
    } else if (playbackState === 'paused') {
      speechService.resume();
    } else {
      if (currentExplanation) {
        speechService.speak(currentExplanation.simple_explanation);
      }
    }
  };

  const handleReplay = () => {
    if (currentExplanation) {
      speechService.speak(currentExplanation.simple_explanation);
    }
  };

  const handleStop = () => {
    speechService.stop();
  };

  const handlePrev = () => {
    if (activeSentenceIndex > 0) {
      onSentenceIndexChange(activeSentenceIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeSentenceIndex < explanations.length - 1) {
      onSentenceIndexChange(activeSentenceIndex + 1);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    speechService.setRate(newRate);
    if (playbackState === 'playing') {
      handleReplay();
    }
  };

  const handleSilentToggle = () => {
    const next = !isSilentMode;
    setIsSilentMode(next);
    speechService.setSilent(next);
  };

  // Web Speech API Voice Input
  const toggleMicListening = () => {
    if (isListeningMic) {
      if (recognitionRef.current && typeof (recognitionRef.current as any).stop === 'function') {
        (recognitionRef.current as any).stop();
      }
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your question directly.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListeningMic(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setChatInput(transcript);
        setIsListeningMic(false);
      };
      rec.onerror = () => setIsListeningMic(false);
      rec.onend = () => setIsListeningMic(false);

      recognitionRef.current = rec;
      rec.start();
    } catch (_err) {
      setIsListeningMic(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    await onSendMessage(msg);
  };

  // Category Badge Helper
  const getCategoryColor = (cat: CategoryEnum) => {
    switch (cat) {
      case 'Payment': return { bg: 'var(--color-payment-bg)', text: 'var(--color-payment)', border: 'var(--color-payment-border)' };
      case 'Deadline': return { bg: 'var(--color-deadline-bg)', text: 'var(--color-deadline)', border: 'var(--color-deadline-border)' };
      case 'Obligation': return { bg: 'var(--color-obligation-bg)', text: 'var(--color-obligation)', border: 'var(--color-obligation-border)' };
      case 'Fee or penalty': return { bg: 'var(--color-penalty-bg)', text: 'var(--color-penalty)', border: 'var(--color-penalty-border)' };
      default: return { bg: 'var(--accent-subtle)', text: 'var(--accent-primary)', border: 'var(--accent-border)' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* Top Tabs Switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface-elevated)'
      }}>
        {(['voice', 'summary', 'chat'] as const).map((tab) => {
          const icons = { voice: Volume2, summary: ListChecks, chat: MessageSquare };
          const labels = { voice: 'Voice Explanations', summary: 'Key Summary', chat: 'Ask Assistant' };
          const Icon = icons[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.75rem 0.5rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{labels[tab]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Voice Explanations */}
      {activeTab === 'voice' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {currentExplanation ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category & Status Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {(() => {
                    const c = getCategoryColor(currentExplanation.category);
                    return (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: c.bg,
                        color: c.text,
                        border: `1px solid ${c.border}`
                      }}>
                        {currentExplanation.category}
                      </span>
                    );
                  })()}

                  {currentExplanation.importance === 'high' && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-danger-bg)',
                      color: 'var(--color-danger)',
                      border: '1px solid var(--color-danger-border)'
                    }}>
                      High Importance
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Clause {activeSentenceIndex + 1} of {explanations.length} • Page {currentExplanation.page}
                </span>
              </div>

              {/* Simplified Explanation Card */}
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-xs)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={15} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                    Plain Language Explanation
                  </span>
                </div>
                <p style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                  {currentExplanation.simple_explanation}
                </p>
              </div>

              {/* Original Document Quote */}
              <div style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '0.95rem 1rem',
                borderLeft: '3px solid var(--accent-primary)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  ORIGINAL DOCUMENT TEXT (PAGE {currentExplanation.page})
                </span>
                &ldquo;{currentExplanation.original_text}&rdquo;
              </div>

              {/* Extracted Metadata Chips */}
              {(currentExplanation.mentioned_amounts.length > 0 || currentExplanation.mentioned_dates.length > 0 || currentExplanation.required_action) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {currentExplanation.mentioned_amounts.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
                      <DollarSign size={14} color="var(--color-payment)" />
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Amounts:</span>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {currentExplanation.mentioned_amounts.map((amt, idx) => (
                          <span key={idx} style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-payment-bg)',
                            color: 'var(--color-payment)',
                            border: '1px solid var(--color-payment-border)',
                            fontWeight: 600,
                            fontSize: '0.78rem'
                          }}>
                            {amt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentExplanation.mentioned_dates.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
                      <Calendar size={14} color="var(--color-deadline)" />
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Deadlines / Dates:</span>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {currentExplanation.mentioned_dates.map((d, idx) => (
                          <span key={idx} style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-deadline-bg)',
                            color: 'var(--color-deadline)',
                            border: '1px solid var(--color-deadline-border)',
                            fontWeight: 600,
                            fontSize: '0.78rem'
                          }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentExplanation.required_action && (
                    <div style={{
                      backgroundColor: 'var(--color-obligation-bg)',
                      border: '1px solid var(--color-obligation-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.55rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-obligation)',
                      fontWeight: 600
                    }}>
                      <CheckCircle2 size={14} />
                      <span>Action required: {currentExplanation.required_action}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Explanations List Navigator */}
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                  ALL IDENTIFIED CLAUSES ({explanations.length})
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}>
                  {explanations.map((exp, idx) => {
                    const isSelected = idx === activeSentenceIndex;
                    const isPlayed = explainedSentenceIds.has(exp.sentence_id);
                    return (
                      <div
                        key={exp.sentence_id}
                        onClick={() => onSentenceIndexChange(idx)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          fontSize: '0.78rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--accent-primary)' : isPlayed ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}>
                          {exp.simple_explanation}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: isSelected ? 'var(--accent-border)' : 'var(--bg-surface-elevated)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'
                        }}>
                          P{exp.page}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No explanations available for this document.
            </div>
          )}

          {/* Voice Playback Control Bar */}
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {playbackState === 'playing' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
                    <div className="wave-bar-1" style={{ width: '3px', backgroundColor: 'var(--accent-primary)', borderRadius: '1px' }} />
                    <div className="wave-bar-2" style={{ width: '3px', backgroundColor: 'var(--accent-primary)', borderRadius: '1px' }} />
                    <div className="wave-bar-3" style={{ width: '3px', backgroundColor: 'var(--accent-primary)', borderRadius: '1px' }} />
                    <div className="wave-bar-4" style={{ width: '3px', backgroundColor: 'var(--accent-primary)', borderRadius: '1px' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginLeft: '4px' }}>
                      Explaining aloud...
                    </span>
                  </div>
                ) : playbackState === 'paused' ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>Audio Paused</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ready for voice playback</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  onClick={handleSilentToggle}
                  style={{
                    backgroundColor: isSilentMode ? 'var(--color-danger-bg)' : 'var(--bg-surface)',
                    border: `1px solid ${isSilentMode ? 'var(--color-danger-border)' : 'var(--border-medium)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
                    color: isSilentMode ? 'var(--color-danger)' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Toggle silent reading mode"
                >
                  {isSilentMode ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  <span>{isSilentMode ? 'Silent' : 'Voice'}</span>
                </button>

                <select
                  value={speechRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 4px',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0.8}>0.8x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.2}>1.2x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem' }}>
              <button 
                onClick={handlePrev} 
                disabled={activeSentenceIndex <= 0} 
                style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: 'var(--radius-full)', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: activeSentenceIndex <= 0 ? 'var(--text-muted)' : 'var(--text-primary)', 
                  cursor: activeSentenceIndex <= 0 ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s'
                }} 
                title="Previous Clause"
              >
                <SkipBack size={15} />
              </button>
              <button 
                onClick={handlePlayToggle} 
                style={{ 
                  backgroundColor: 'var(--accent-primary)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 'var(--radius-full)', 
                  width: '44px', 
                  height: '44px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'background-color 0.15s'
                }} 
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                title={playbackState === 'playing' ? 'Pause' : 'Play'}
              >
                {playbackState === 'playing' ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
              </button>
              <button 
                onClick={handleReplay} 
                style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: 'var(--radius-full)', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-primary)', 
                  cursor: 'pointer' 
                }} 
                title="Replay"
              >
                <RotateCcw size={14} />
              </button>
              <button 
                onClick={handleNext} 
                disabled={activeSentenceIndex >= explanations.length - 1} 
                style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: 'var(--radius-full)', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: activeSentenceIndex >= explanations.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', 
                  cursor: activeSentenceIndex >= explanations.length - 1 ? 'not-allowed' : 'pointer' 
                }} 
                title="Next Clause"
              >
                <SkipForward size={15} />
              </button>
              <button 
                onClick={handleStop} 
                style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: 'var(--radius-full)', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer' 
                }} 
                title="Stop"
              >
                <Square size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Important Summary */}
      {activeTab === 'summary' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {summary ? (
            <>
              <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Document Overview</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{summary.overview}</p>
              </div>

              {[
                { title: 'Important Payment Amounts', icon: DollarSign, color: 'var(--color-payment)', items: summary.payment_amounts },
                { title: 'Due Dates & Deadlines', icon: Calendar, color: 'var(--color-deadline)', items: summary.due_dates_and_deadlines },
                { title: 'Required Actions', icon: CheckCircle2, color: 'var(--color-obligation)', items: summary.required_actions },
                { title: 'Contractual Obligations', icon: ListChecks, color: 'var(--accent-primary)', items: summary.contractual_obligations },
                { title: 'Penalties & Fees', icon: AlertCircle, color: 'var(--color-penalty)', items: summary.penalties_and_fees },
                { title: 'Conditions & Exceptions', icon: Info, color: 'var(--color-info)', items: summary.conditions_and_exceptions },
                { title: 'Clauses Requiring Review', icon: HelpCircle, color: 'var(--color-warning)', items: summary.clauses_requiring_review },
              ].map((section, sIdx) => {
                if (!section.items || section.items.length === 0) return null;
                const IconComponent = section.icon;
                return (
                  <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconComponent size={15} color={section.color} />
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{section.title} ({section.items.length})</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {section.items.map((item, iIdx) => (
                        <div key={iIdx} onClick={() => { if (item.source_sentence_id) { onJumpToSentence(item.source_page, item.source_sentence_id); setActiveTab('voice'); } }} style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-subtle)', cursor: item.source_sentence_id ? 'pointer' : 'default', transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>Page {item.source_page}</span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Summary data is being analyzed.</div>
          )}
        </div>
      )}

      {/* Tab 3: Grounded Chat */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                  <MessageSquare size={20} color="var(--accent-primary)" />
                </div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Ask Questions About This Document</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 1.25rem auto' }}>Every answer is strictly grounded in the document text with page & clause citations.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUGGESTED QUESTIONS:</span>
                  {["When is the payment due?", "What happens if I pay late?", "How much is the total amount due?", "What are my cancellation options?"].map((q, idx) => (
                    <button key={idx} onClick={() => onSendMessage(q)} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.75rem', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}>
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{
                    backgroundColor: msg.role === 'user' ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    border: msg.role === 'user' ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-xs)',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <button onClick={() => speechService.speak(msg.content)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: '0.72rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
                        <Volume2 size={12} /><span>Listen Aloud</span>
                      </button>
                      {msg.citations && msg.citations.length > 0 && (
                        <div style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '0.2rem' }}>Source Citation: Page {msg.citations[0].page}</span>
                          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.3rem' }}>&ldquo;{msg.citations[0].original_text}&rdquo;</p>
                          <button onClick={() => onJumpToSentence(msg.citations![0].page, msg.citations![0].sentence_id)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ExternalLink size={12} /><span>Highlight on document</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleChatSubmit} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button type="button" onClick={toggleMicListening} style={{ backgroundColor: isListeningMic ? 'var(--color-danger-bg)' : 'var(--bg-surface)', color: isListeningMic ? 'var(--color-danger)' : 'var(--text-secondary)', border: `1px solid ${isListeningMic ? 'var(--color-danger-border)' : 'var(--border-medium)'}`, borderRadius: 'var(--radius-full)', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title={isListeningMic ? 'Stop listening' : 'Ask by voice'}>
              {isListeningMic ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={isListeningMic ? "Listening..." : "Ask about this document..."} disabled={isChatLoading} style={{ flex: 1, backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', fontSize: '0.85rem', outline: 'none' }} />
            <button type="submit" disabled={!chatInput.trim() || isChatLoading} style={{ backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-xs)' }}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
