export type Mode = "polish" | "plan" | "craft" | "build" | "learn";

export interface ModeConfig {
  id: Mode;
  name: string;
  description: string;
  icon: string;
}

export interface PolishResult {
  refined_text: string;
}

export interface PlanResult {
  plan_title: string;
  schedule: Array<{ time: string; activity: string }>;
  checklist: string[];
  checked_items?: number[];
}

export interface CraftResult {
  generated_content: string;
}

export interface BuildResult {
  html_code: string;
  fixed_code?: string;
}

export interface LearnResult {
  study_title: string;
  key_concepts: Array<{ term: string; explanation: string }>;
  summary: string;
  flashcards: Array<{ question: string; answer: string }>;
}

export type AIResult =
  | PolishResult
  | PlanResult
  | CraftResult
  | BuildResult
  | LearnResult;

export interface SavedFile {
  id: string;
  name: string;
  mode: Mode;
  content: string;
  createdAt: Date;
  audioBlob?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  stage:
    | "idle"
    | "transcribing"
    | "processing"
    | "refining"
    | "complete"
    | "error";
  error: string | null;
}

export interface AppState {
  currentMode: Mode;
  showWelcome: boolean;
  recording: RecordingState;
  processing: ProcessingState;
  result: AIResult | null;
  savedFiles: SavedFile[];
}
