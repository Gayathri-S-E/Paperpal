import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { UploadModal } from './components/UploadModal';
import { DocumentViewer } from './components/DocumentViewer';
import { AssistantPanel } from './components/AssistantPanel';
import type { 
  DocumentInfo, 
  PageInfo, 
  SentenceExplanation, 
  DocumentSummary, 
  ChatMessage 
} from './types';
import { api } from './services/api';
import { speechService } from './services/speech';

export const App: React.FC = () => {
  const [currentDoc, setCurrentDoc] = useState<DocumentInfo | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [explanations, setExplanations] = useState<SentenceExplanation[]>([]);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [explainedSentenceIds, setExplainedSentenceIds] = useState<Set<string>>(new Set());
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'camera'>('upload');
  const [recentDocuments, setRecentDocuments] = useState<DocumentInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiConfigured, setIsAiConfigured] = useState<boolean>(false);

  // Load initial health and recent documents
  useEffect(() => {
    loadHealthAndRecents();
  }, []);

  const loadHealthAndRecents = async () => {
    try {
      const health = await api.getHealth();
      setIsAiConfigured(health.ai_provider_configured);
      const docs = await api.listDocuments();
      setRecentDocuments(docs);
    } catch (e) {
      console.warn('Backend connection error:', e);
    }
  };

  const loadDocumentDetails = async (docId: string) => {
    setIsLoading(true);
    speechService.stop();
    try {
      const doc = await api.getDocument(docId);
      setCurrentDoc(doc);

      const docPages = await api.getDocumentPages(docId);
      setPages(docPages);
      setCurrentPage(1);

      const analysis = await api.getExplanations(docId);
      setExplanations(analysis.explanations);
      setSummary(analysis.summary);
      setActiveSentenceIndex(0);
      setExplainedSentenceIds(new Set());
      setChatMessages([]);

      // Refresh recent list
      const docs = await api.listDocuments();
      setRecentDocuments(docs);
    } catch (err: any) {
      console.error('Document load error:', err);
      alert('Failed to load document analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const newDoc = await api.uploadDocument(file);
    await loadDocumentDetails(newDoc.id);
  };

  const handleSelectSample = async (sampleType: 'utility_bill' | 'lease_agreement' | 'bank_notice') => {
    setIsLoading(true);
    try {
      const doc = await api.loadSampleDocument(sampleType);
      await loadDocumentDetails(doc.id);
    } catch (err: any) {
      console.error('Sample load error:', err);
      alert('Failed to load sample document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and all its data?')) return;
    try {
      await api.deleteDocument(docId);
      if (currentDoc?.id === docId) {
        setCurrentDoc(null);
        setPages([]);
        setExplanations([]);
      }
      const docs = await api.listDocuments();
      setRecentDocuments(docs);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSentenceIndexChange = (index: number) => {
    if (index < 0 || index >= explanations.length) return;
    setActiveSentenceIndex(index);
    const exp = explanations[index];
    if (exp) {
      setExplainedSentenceIds((prev) => new Set([...prev, exp.sentence_id]));
      if (exp.page !== currentPage) {
        setCurrentPage(exp.page);
      }
    }
  };

  const handleSelectSentence = (sentenceId: string) => {
    const idx = explanations.findIndex((e) => e.sentence_id === sentenceId);
    if (idx !== -1) {
      handleSentenceIndexChange(idx);
    }
  };

  const handleJumpToSentence = (page: number, sentenceId: string) => {
    setCurrentPage(page);
    handleSelectSentence(sentenceId);
  };

  const handleSendMessage = async (msg: string) => {
    if (!currentDoc) return;
    const userMsg: ChatMessage = { role: 'user', content: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const resp = await api.chatWithDocument(currentDoc.id, msg, chatMessages);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: resp.answer,
        citations: resp.citations
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI analysis is temporarily unavailable. Please try again.' }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Lookup map of explanations by sentence_id for fast O(1) overlay lookup
  const explanationsMap = useMemo(() => {
    const map = new Map<string, SentenceExplanation>();
    for (const exp of explanations) {
      map.set(exp.sentence_id, exp);
    }
    return map;
  }, [explanations]);

  const activeSentenceId = explanations[activeSentenceIndex]?.sentence_id || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <Header
        currentDoc={currentDoc}
        onNewDocument={() => {
          setUploadMode('upload');
          setIsUploadModalOpen(true);
        }}
        onGoHome={() => {
          speechService.stop();
          setCurrentDoc(null);
        }}
        isAiConfigured={isAiConfigured}
      />

      {/* Main Content View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!currentDoc ? (
          /* Screen A: Home & Welcome View */
          <HomeView
            onScanCamera={() => {
              setUploadMode('camera');
              setIsUploadModalOpen(true);
            }}
            onUploadFile={() => {
              setUploadMode('upload');
              setIsUploadModalOpen(true);
            }}
            onSelectSample={handleSelectSample}
            recentDocuments={recentDocuments}
            onOpenDocument={loadDocumentDetails}
            onDeleteDocument={handleDeleteDocument}
            isLoading={isLoading}
          />
        ) : (
          /* Screen C: 2-Panel Document Understanding & Voice Workspace */
          <div 
            className="workspace-layout"
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(320px, 0.85fr)',
              gap: '1rem',
              padding: '1rem',
              height: 'calc(100vh - 65px)',
              overflow: 'hidden'
            }}
          >
            {/* Left Panel: Document Viewer with Bounding Box Highlights */}
            <div style={{ height: '100%', minHeight: 0 }}>
              <DocumentViewer
                docId={currentDoc.id}
                pages={pages}
                currentPage={currentPage}
                onPageChange={(p) => setCurrentPage(p)}
                activeSentenceId={activeSentenceId}
                explainedSentenceIds={explainedSentenceIds}
                onSelectSentence={handleSelectSentence}
                explanationsMap={explanationsMap}
              />
            </div>

            {/* Right Panel: AI Voice Assistant, Summary & Grounded Chat */}
            <div style={{ height: '100%', minHeight: 0 }}>
              <AssistantPanel
                docId={currentDoc.id}
                explanations={explanations}
                summary={summary}
                activeSentenceIndex={activeSentenceIndex}
                onSentenceIndexChange={handleSentenceIndexChange}
                explainedSentenceIds={explainedSentenceIds}
                onSendMessage={handleSendMessage}
                chatMessages={chatMessages}
                isChatLoading={isChatLoading}
                onJumpToSentence={handleJumpToSentence}
              />
            </div>
          </div>
        )}
      </main>

      {/* Screen B: Upload / Camera Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        initialMode={uploadMode}
      />
    </div>
  );
};

export default App;
