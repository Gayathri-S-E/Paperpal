import type { 
  DocumentInfo, 
  PageInfo, 
  DocumentAnalysisResponse, 
  ChatResponse, 
  ChatMessage 
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; app: string; version: string; ai_provider_configured: boolean; active_provider?: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async listDocuments(): Promise<DocumentInfo[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(file: File, title?: string): Promise<DocumentInfo> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  async loadSampleDocument(sampleName: 'utility_bill' | 'lease_agreement' | 'bank_notice'): Promise<DocumentInfo> {
    const res = await fetch(`${API_BASE}/documents/sample/${sampleName}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load sample' }));
      throw new Error(err.detail || 'Sample load failed');
    }
    return res.json();
  },

  async getDocument(docId: string): Promise<DocumentInfo> {
    const res = await fetch(`${API_BASE}/documents/${docId}`);
    if (!res.ok) throw new Error('Document not found');
    return res.json();
  },

  async getDocumentPages(docId: string): Promise<PageInfo[]> {
    const res = await fetch(`${API_BASE}/documents/${docId}/pages`);
    if (!res.ok) throw new Error('Failed to fetch document pages');
    return res.json();
  },

  async getExplanations(docId: string): Promise<DocumentAnalysisResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/explanations`);
    if (!res.ok) throw new Error('Failed to fetch explanations');
    return res.json();
  },

  async chatWithDocument(docId: string, message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/documents/${docId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_history: history,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
      throw new Error(err.detail || 'Chat failed');
    }
    return res.json();
  },

  async deleteDocument(docId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  getPageImageUrl(docId: string, pageNum: number): string {
    return `${API_BASE}/documents/${docId}/pages/${pageNum}/image`;
  }
};
