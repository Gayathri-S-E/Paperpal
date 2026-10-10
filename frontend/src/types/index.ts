export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SentenceLocation {
  sentence_id: string;
  page: number;
  original_text: string;
  bounding_boxes: BoundingBox[];
  reading_order_index: number;
  is_location_confident: boolean;
}

export interface PageInfo {
  page_number: number;
  width_pts: number;
  height_pts: number;
  image_url: string;
  text_content: string;
  sentences: SentenceLocation[];
}

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: 'pdf' | 'image';
  file_size_bytes: number;
  total_pages: number;
  created_at: string;
  status: DocumentStatus;
  error_message?: string;
  is_sample?: boolean;
  title?: string;
}

export type ImportanceLevel = 'high' | 'medium' | 'low';

export type CategoryEnum = 
  | 'Payment'
  | 'Deadline'
  | 'Obligation'
  | 'Fee or penalty'
  | 'Eligibility'
  | 'Termination'
  | 'Renewal'
  | 'Deposit'
  | 'Important condition'
  | 'General information';

export interface SentenceExplanation {
  sentence_id: string;
  page: number;
  original_text: string;
  simple_explanation: string;
  importance: ImportanceLevel;
  category: CategoryEnum;
  mentioned_amounts: string[];
  mentioned_dates: string[];
  required_action?: string | null;
  uncertainty_notes?: string | null;
  bounding_boxes: BoundingBox[];
  is_location_confident: boolean;
}

export interface SummaryItem {
  title: string;
  details: string;
  source_page: number;
  source_sentence_id?: string | null;
  category: string;
  importance: ImportanceLevel;
}

export interface DocumentSummary {
  overview: string;
  payment_amounts: SummaryItem[];
  due_dates_and_deadlines: SummaryItem[];
  required_actions: SummaryItem[];
  contractual_obligations: SummaryItem[];
  penalties_and_fees: SummaryItem[];
  conditions_and_exceptions: SummaryItem[];
  clauses_requiring_review: SummaryItem[];
}

export interface DocumentAnalysisResponse {
  document_id: string;
  explanations: SentenceExplanation[];
  summary: DocumentSummary;
  total_important_sentences: number;
  ai_provider?: string;
}

export interface GroundedCitation {
  page: number;
  sentence_id: string;
  original_text: string;
  relevance_score: number;
  bounding_boxes: BoundingBox[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  citations?: GroundedCitation[];
}

export interface ChatResponse {
  answer: string;
  citations: GroundedCitation[];
  has_sufficient_info: boolean;
  suggested_followups: string[];
  ai_provider?: string;
}

export interface VoiceSettings {
  rate: number;
  pitch: number;
  voiceName: string;
  autoAdvance: boolean;
  isSilent: boolean;
}
