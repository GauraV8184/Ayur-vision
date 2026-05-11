import type { KnowledgeSource } from "../../../services/api";

/** Sidebar / composer message shape (persisted assistant rows mirror server fields). */
export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  error?: string;
  model?: string | null;
  /** Not from server: only the default welcome when a thread has no stored messages */
  isLocalWelcome?: boolean;
}

/** Mirrored from API thread summaries for UI-only helpers */
export type KnowledgeContextMode = "general" | "patient";
