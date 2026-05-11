import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "../config/env";
import { supabase } from "../lib/supabase";

/** When unset in dev, use relative `/api` so Vite can proxy to the Express backend (see vite.config.ts). */
export const API_BASE_URL = env.VITE_API_URL;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : "/api",
  timeout: 15000,
});

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UploadImageResponse {
  message: string;
  imageUrl: string;
  plant: string;
  confidence: number;
  ttaSteps: number | null;
  predictionId?: string;
}

export interface KnowledgeSource {
  title: string;
  source: string;
  excerpt: string;
  page: number | null;
}

export interface KnowledgeResponse {
  answer?: string;
  sources?: KnowledgeSource[];
  model?: string | null;
  error?: string;
  retrieved_chunks?: number;
}

export const signup = (data: SignupPayload): Promise<AxiosResponse<unknown>> =>
  api.post("/auth/signup", data);

export const login = (data: LoginPayload): Promise<AxiosResponse<unknown>> =>
  api.post("/auth/login", data);

export const uploadImage = (formData: FormData) =>
  api.post<FormData, AxiosResponse<UploadImageResponse>, FormData>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export type AskKnowledgeBody = {
  question: string;
  /** Passed to FastAPI POST /api/v1/query when useConversation is true */
  sessionId?: string;
  useConversation?: boolean;
};

/** Proxied by Express to the Ayurvedic RAG service: `POST {RAG_API_URL}/api/v1/query`. */
export const askKnowledge = (body: AskKnowledgeBody) =>
  api.post<
    KnowledgeResponse,
    AxiosResponse<KnowledgeResponse>,
    AskKnowledgeBody
  >("/knowledge", body, { timeout: 120000 });

/** Persisted Knowledge Assistant thread (sidebar + URL restore). */
export interface KnowledgePatientSummary {
  id: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  chiefComplaint?: string | null;
}

export interface KnowledgeChatThreadSummary {
  id: string;
  title: string;
  rag_session_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  context_mode: "general" | "patient";
  patient_id: string | null;
  patientSummary?: KnowledgePatientSummary | null;
}

/** Message row from `GET /api/knowledge/chats/:id/messages` or append response. */
export interface KnowledgeChatMessageRecord {
  id: string;
  thread_id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[] | unknown;
  model?: string | null;
  error?: string | null;
  created_at: string;
}

export interface CreateKnowledgeChatPayload {
  title?: string;
  initialMessage?: string;
  contextMode?: "general" | "patient";
  patientId?: string | null;
}

export interface SendKnowledgeChatMessagePayload {
  question: string;
}

export interface SendKnowledgeChatResponse {
  userMessage: KnowledgeChatMessageRecord;
  assistantMessage: KnowledgeChatMessageRecord;
  thread: KnowledgeChatThreadSummary;
}

export const listKnowledgeChats = () =>
  api.get<{ threads: KnowledgeChatThreadSummary[] }>("/knowledge/chats");

export const createKnowledgeChat = (payload?: CreateKnowledgeChatPayload) =>
  api.post<
    { thread: KnowledgeChatThreadSummary },
    AxiosResponse<{ thread: KnowledgeChatThreadSummary }>,
    CreateKnowledgeChatPayload | Record<string, never>
  >("/knowledge/chats", payload ?? {}, { timeout: 120000 });

export interface KnowledgeChatMessagesResponse {
  messages: KnowledgeChatMessageRecord[];
  thread: KnowledgeChatThreadSummary;
}

export const getKnowledgeChatMessages = (threadId: string) =>
  api.get<KnowledgeChatMessagesResponse>(`/knowledge/chats/${threadId}/messages`);

export const sendKnowledgeChatMessage = (
  threadId: string,
  payload: SendKnowledgeChatMessagePayload
) =>
  api.post<
    SendKnowledgeChatResponse,
    AxiosResponse<SendKnowledgeChatResponse>,
    SendKnowledgeChatMessagePayload
  >(`/knowledge/chats/${threadId}/messages`, payload, { timeout: 120000 });

export const deleteKnowledgeChat = (threadId: string) =>
  api.delete<{ ok: boolean }>(`/knowledge/chats/${threadId}`);

export interface UpdateKnowledgeChatPayload {
  title?: string;
  patientId?: string | null;
  contextMode?: "general" | "patient";
}

export const updateKnowledgeChat = (threadId: string, payload: UpdateKnowledgeChatPayload) =>
  api.patch<
    { thread: KnowledgeChatThreadSummary },
    AxiosResponse<{ thread: KnowledgeChatThreadSummary }>,
    UpdateKnowledgeChatPayload
  >(`/knowledge/chats/${threadId}`, payload);

/** @deprecated Use updateKnowledgeChat — kept for narrow rename-only call sites */
export const renameKnowledgeChat = (threadId: string, payload: { title: string }) =>
  updateKnowledgeChat(threadId, payload);

/** Prakriti model response (Flask via Node /api/prakriti). */
export interface PrakritiPredictionResponse {
  vata_pct: number;
  pitta_pct: number;
  kapha_pct: number;
  dominant_dosha: string;
  /** Calibrated top-class probability, 0–1 */
  confidence?: number;
  /** Same as confidence × 100 */
  confidence_pct?: number;
  low_confidence?: boolean;
  all_class_probabilities?: Record<string, number>;
  dosha_probabilities?: Record<string, number>;
  dosha_percentages?: { vata: number; pitta: number; kapha: number };
  top_features?: { feature: string; importance: number }[];
  interpretation: string;
  saved?: boolean;
  model_used?: string;
}

/**
 * POST /api/prakriti — forwards `answers` to Flask /predict-prakriti (JWT via interceptor).
 * `answers` must include keys from ai-service model metadata `inference_input_keys` (age, gender, Q1_…, Q24_…).
 */
export const predictPrakriti = (
  answers: Record<string, unknown>,
  options?: { patientId?: string; patientName?: string }
) =>
  api.post<
    PrakritiPredictionResponse,
    AxiosResponse<PrakritiPredictionResponse>,
    { answers: Record<string, unknown>; patientId?: string; patientName?: string }
  >("/prakriti", {
    answers,
    ...(options?.patientId ? { patientId: options.patientId } : {}),
    ...(options?.patientName ? { patientName: options.patientName } : {}),
  });

/** Flask disease classifier via Express proxy (`POST /api/disease/predict-disease`). */
export interface DiseaseCandidate {
  disease: string;
  probability: number;
  confidence: number;
  matched_symptoms: number;
}

export interface DiseasePredictionApiResponse {
  diseases: DiseaseCandidate[];
  total_symptoms: number;
  model_version: string;
  test_accuracy: number;
}

export const predictDisease = (symptoms: string[], topK = 5) =>
  api.post<
    DiseasePredictionApiResponse,
    AxiosResponse<DiseasePredictionApiResponse>,
    { symptoms: string[]; top_k: number }
  >("/disease/predict-disease", { symptoms, top_k: topK });

export const getAvailableSymptoms = () =>
  api.get<{ symptoms: string[]; count: number }>("/disease/symptoms");

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;
