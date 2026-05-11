import express from "express";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import authMiddleware from "../middleware/authMiddleware.js";
import { supabase } from "../config/supabase.js";
import {
  buildPatientKnowledgeContext,
  fetchPatientForDoctor,
  formatClinicalContextPromptBlock,
  patientRowToSummaryLight,
  type PatientSummaryLight,
} from "../services/patientKnowledgeContext.js";
import { env } from "../config/env.js";

type ContextMode = "general" | "patient";

const router = express.Router();

/** FastAPI Ayurvedic RAG (`apps/ai-service/rag/main.py`, default port 8000). */
const RAG_API_URL = env.RAG_API_URL.replace(/\/$/, "");

type RagCitation = {
  index?: number;
  document_title?: string;
  page_number?: number | null;
  source_type?: string;
  snippet?: string;
};

type RagQueryJson = {
  answer?: string;
  citations?: RagCitation[];
  model_used?: string;
  chunks_retrieved?: number;
  chunks_after_rerank?: number;
};

export type NormalizedKnowledgeSource = {
  title: string;
  source: string;
  excerpt: string;
  page: number | null;
};

/** Outcome mapped for API responses and DB persistence (assistant row). */
export type ExecuteRagResult = {
  answer: string;
  sources: NormalizedKnowledgeSource[];
  model: string | null;
  error: string | null;
};

function formatFetchDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return "Request failed.";
}

function mapCitationsToSources(citations: RagCitation[]): NormalizedKnowledgeSource[] {
  return citations.map((c) => {
    const snippet = typeof c.snippet === "string" ? c.snippet : "";
    const excerpt = snippet.length > 200 ? `${snippet.slice(0, 200)}...` : snippet;
    return {
      title:
        typeof c.document_title === "string" && c.document_title ? c.document_title : "Source",
      source: typeof c.source_type === "string" && c.source_type ? c.source_type : "reference",
      excerpt,
      page: typeof c.page_number === "number" ? c.page_number : null,
    };
  });
}

type PerformRagOutcome =
  | { kind: "bad_request"; message: string }
  | { kind: "upstream_502"; message: string }
  | { kind: "not_found_passages"; logDetail: string }
  | {
      kind: "ok";
      answer: string;
      sources: NormalizedKnowledgeSource[];
      model: string | null;
    };

/** Shared FastAPI fetch; preserves legacy POST /api/knowledge HTTP semantics when used from that route. */
async function performRagRequest(
  trimmed: string,
  useConversation: boolean,
  sessionId: string | null,
  clinicalContext?: string | null
): Promise<PerformRagOutcome> {
  const ragUrl = `${RAG_API_URL}/api/v1/query`;
  const shouldUseConversation = useConversation === true;
  const sid = typeof sessionId === "string" ? sessionId.trim() : "";

  const ragPayload: Record<string, unknown> = {
    query: trimmed,
    use_conversation: shouldUseConversation,
    session_id: shouldUseConversation ? sid : undefined,
    top_k: 8,
    top_n: 5,
  };

  const cc =
    typeof clinicalContext === "string" && clinicalContext.trim().length > 0
      ? clinicalContext.trim()
      : "";
  if (cc) {
    ragPayload.clinical_context = cc;
  }

  console.info("[knowledge] incoming", {
    question_preview: trimmed.slice(0, 160),
    question_len: trimmed.length,
    use_conversation: shouldUseConversation,
    has_session_id: Boolean(sid),
    rag_url: ragUrl,
  });

  if (shouldUseConversation && !sid) {
    return {
      kind: "bad_request",
      message: "sessionId is required when useConversation is true.",
    };
  }

  try {
    const response = await fetch(ragUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ragPayload),
      signal: AbortSignal.timeout(120_000),
    });

    console.info("[knowledge] upstream", { rag_url: ragUrl, status: response.status });

    if (response.status === 404) {
      const errBody = (await response.json().catch(() => ({}))) as { detail?: unknown };
      const detail = formatFetchDetail(errBody.detail);
      console.info("[knowledge] no_passages", { rag_url: ragUrl, detail });
      return { kind: "not_found_passages", logDetail: detail };
    }

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as {
        detail?: unknown;
        error?: string;
        message?: string;
      };

      const rawDetail =
        (typeof errBody.detail === "string" ? errBody.detail : null) ||
        formatFetchDetail(errBody.detail) ||
        errBody.error ||
        errBody.message ||
        "Upstream error.";

      console.error("[knowledge] upstream_error", {
        rag_url: ragUrl,
        status: response.status,
        detail: rawDetail,
      });

      return {
        kind: "upstream_502",
        message: "Knowledge service is unavailable. Please try again.",
      };
    }

    const data = (await response.json()) as RagQueryJson;
    const answer = typeof data.answer === "string" ? data.answer : "";
    const citations = Array.isArray(data.citations) ? data.citations : [];
    const sources = mapCitationsToSources(citations);

    console.info("[knowledge] mapped", {
      ok: true,
      sources: sources.length,
      model: data.model_used ?? null,
    });

    return {
      kind: "ok",
      answer,
      sources,
      model: data.model_used ?? null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[knowledge] proxy_failed", { rag_url: ragUrl, error: msg });
    return {
      kind: "upstream_502",
      message: "Knowledge service is unavailable. Please try again.",
    };
  }
}

/**
 * Maps RAG outcomes to fields stored on assistant messages (always persistable).
 */
export async function executeAyurvedicRag(
  trimmed: string,
  useConversation: boolean,
  sessionId: string | null,
  clinicalContext?: string | null
): Promise<ExecuteRagResult> {
  const out = await performRagRequest(trimmed, useConversation, sessionId, clinicalContext);

  const NO_PASSAGES =
    "I couldn't find relevant Ayurvedic references for that question.";

  switch (out.kind) {
    case "bad_request":
      return {
        answer: "Sorry, I couldn't process that question.",
        sources: [],
        model: null,
        error: out.message,
      };
    case "upstream_502":
      return {
        answer: "Sorry, I couldn't process that question.",
        sources: [],
        model: null,
        error: out.message,
      };
    case "not_found_passages":
      return {
        answer: NO_PASSAGES,
        sources: [],
        model: null,
        error: null,
      };
    case "ok": {
      const trimmedAns = out.answer.trim();
      if (!trimmedAns) {
        const errMsg = "Sorry, I couldn't process that question.";
        return {
          answer: errMsg,
          sources: out.sources,
          model: out.model,
          error: "The knowledge service returned an empty answer.",
        };
      }
      return {
        answer: trimmedAns,
        sources: out.sources,
        model: out.model,
        error: null,
      };
    }
  }
}

function threadTitleFromFirstMessage(raw: string): string {
  const singleLine = raw.trim().replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  return singleLine.length > 60 ? singleLine.slice(0, 60) : singleLine;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/** Express 5 may type params as string | string[] */
function routeParam(id: string | string[] | undefined): string {
  if (Array.isArray(id)) return id[0] ?? "";
  return typeof id === "string" ? id : "";
}

type ThreadRow = {
  id: string;
  user_id: string;
  title: string;
  rag_session_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
  patient_id: string | null;
  context_mode: ContextMode;
};

function normalizeThreadRow(row: Record<string, unknown>): ThreadRow {
  const pidRaw = row.patient_id;
  const patient_id =
    typeof pidRaw === "string" && isUuid(pidRaw)
      ? pidRaw
      : null;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? "New chat"),
    rag_session_id: String(row.rag_session_id ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    last_message_at: String(row.last_message_at ?? ""),
    is_archived: Boolean(row.is_archived),
    patient_id,
    /** Any linked patient implies clinical context mode for API consumers. */
    context_mode: (patient_id ? "patient" : "general") as ContextMode,
  };
}

async function fetchOwnedThread(userId: string, threadId: string): Promise<ThreadRow | null> {
  const { data, error } = await supabase
    .from("knowledge_chat_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[knowledge/chats] fetch_thread", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  return normalizeThreadRow(data as Record<string, unknown>);
}

async function fetchPatientSummariesMap(
  doctorId: string,
  ids: (string | null | undefined)[]
): Promise<Map<string, PatientSummaryLight>> {
  const unique = [
    ...new Set(ids.filter((x): x is string => typeof x === "string" && isUuid(x))),
  ];
  const map = new Map<string, PatientSummaryLight>();
  if (!unique.length) return map;

  const { data, error } = await supabase
    .from("patients")
    .select("id, name, age, gender, chief_complaint")
    .eq("doctor_id", doctorId)
    .in("id", unique);

  if (error || !data) return map;

  for (const raw of data as Record<string, unknown>[]) {
    const s = patientRowToSummaryLight(raw);
    map.set(s.id, s);
  }
  return map;
}

function threadApiSummary(row: ThreadRow, patientMap: Map<string, PatientSummaryLight>) {
  const pid = row.patient_id;
  const patientSummary =
    pid && patientMap.has(pid)
      ? {
          id: patientMap.get(pid)!.id,
          name: patientMap.get(pid)!.name,
          age: patientMap.get(pid)!.age,
          gender: patientMap.get(pid)!.gender,
          chiefComplaint: patientMap.get(pid)!.chiefComplaint,
        }
      : null;

  return {
    id: row.id,
    title: row.title,
    rag_session_id: row.rag_session_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_message_at: row.last_message_at,
    context_mode: row.context_mode,
    patient_id: row.patient_id,
    patientSummary,
  };
}

// --- Chat REST (persisted threads; rag_session_id ties into FastAPI conversation memory) ---

router.post("/knowledge/chats", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body as {
    title?: unknown;
    initialMessage?: unknown;
    contextMode?: unknown;
    patientId?: unknown;
  };

  const titleRaw = typeof body.title === "string" ? body.title.trim() : "";
  const title = titleRaw.length > 0 ? titleRaw.slice(0, 200) : "New chat";
  const initialMessage =
    typeof body.initialMessage === "string" ? body.initialMessage.trim() : "";

  let patient_id: string | null = null;
  let context_mode: ContextMode = "general";

  if (typeof body.contextMode === "string" && body.contextMode === "general") {
    context_mode = "general";
    patient_id = null;
  }

  const pidBody = body.patientId;
  if (typeof pidBody === "string" && isUuid(pidBody.trim())) {
    const ok = await fetchPatientForDoctor(userId, pidBody.trim());
    if (!ok) {
      return res.status(403).json({ message: "Patient not found or access denied." });
    }
    patient_id = pidBody.trim();
    context_mode = "patient";
  }

  if (typeof body.contextMode === "string" && body.contextMode === "patient") {
    if (!patient_id) {
      return res.status(400).json({ message: "patientId is required for patient context mode." });
    }
    context_mode = "patient";
  }

  const ragSessionId = randomUUID();

  const { data: inserted, error: insertErr } = await supabase
    .from("knowledge_chat_threads")
    .insert({
      user_id: userId,
      title,
      rag_session_id: ragSessionId,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      patient_id,
      context_mode,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    console.error("[knowledge/chats] create_thread", insertErr?.message);
    return res.status(500).json({ message: "Could not create chat thread." });
  }

  let thread = normalizeThreadRow(inserted as Record<string, unknown>);

  if (initialMessage.length >= 3) {
    const now = new Date().toISOString();
    const nextTitle =
      thread.title === "New chat" ? threadTitleFromFirstMessage(initialMessage) : thread.title;

    const { error: uErr } = await supabase.from("knowledge_chat_messages").insert([
      {
        thread_id: thread.id,
        user_id: userId,
        role: "user",
        content: initialMessage,
        sources: [],
      },
    ]);

    if (uErr) {
      console.error("[knowledge/chats] insert_user_msg", uErr.message);
      return res.status(500).json({ message: "Could not save message." });
    }

    let clinicalBlock: string | null = null;
    if (thread.patient_id && thread.context_mode === "patient") {
      const bundle = await buildPatientKnowledgeContext(userId, thread.patient_id);
      if (bundle) clinicalBlock = formatClinicalContextPromptBlock(bundle);
    }

    const rag = await executeAyurvedicRag(
      initialMessage,
      true,
      thread.rag_session_id,
      clinicalBlock
    );

    const { data: asst, error: aErr } = await supabase
      .from("knowledge_chat_messages")
      .insert({
        thread_id: thread.id,
        user_id: userId,
        role: "assistant",
        content: rag.answer,
        sources: rag.sources,
        model: rag.model,
        error: rag.error,
      })
      .select("*")
      .single();

    if (aErr || !asst) {
      console.error("[knowledge/chats] insert_assistant_msg", aErr?.message);
      return res.status(500).json({ message: "Could not save assistant reply." });
    }

    const { data: updatedThread, error: tErr } = await supabase
      .from("knowledge_chat_threads")
      .update({
        title: nextTitle,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", thread.id)
      .select("*")
      .single();

    if (tErr || !updatedThread) {
      console.error("[knowledge/chats] update_thread_after_initial", tErr?.message);
    } else {
      thread = normalizeThreadRow(updatedThread as Record<string, unknown>);
    }
  }

  const patientMap = await fetchPatientSummariesMap(userId, [thread.patient_id]);
  return res.status(201).json({ thread: threadApiSummary(thread, patientMap) });
});

router.get("/knowledge/chats", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from("knowledge_chat_threads")
    .select(
      "id, title, rag_session_id, created_at, updated_at, last_message_at, patient_id, context_mode"
    )
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[knowledge/chats] list", error.message);
    return res.status(500).json({ message: "Could not load chats." });
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const patientMap = await fetchPatientSummariesMap(
    userId,
    rows.map((r) => r.patient_id as string | null | undefined)
  );

  const threads = rows.map((r) => threadApiSummary(normalizeThreadRow(r), patientMap));

  return res.status(200).json({ threads });
});

router.get("/knowledge/chats/:threadId/messages", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const threadId = routeParam(req.params.threadId);

  if (!isUuid(threadId)) {
    return res.status(400).json({ message: "Invalid thread id." });
  }

  const thread = await fetchOwnedThread(userId, threadId);
  if (!thread) {
    return res.status(404).json({ message: "Thread not found." });
  }

  const { data, error } = await supabase
    .from("knowledge_chat_messages")
    .select("id, thread_id, role, content, sources, model, error, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[knowledge/chats] messages", error.message);
    return res.status(500).json({ message: "Could not load messages." });
  }

  const patientMap = await fetchPatientSummariesMap(userId, [thread.patient_id]);

  return res.status(200).json({
    messages: data ?? [],
    thread: threadApiSummary(thread, patientMap),
  });
});

router.post("/knowledge/chats/:threadId/messages", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const threadId = routeParam(req.params.threadId);
  const { question } = req.body as { question?: unknown };

  if (!isUuid(threadId)) {
    return res.status(400).json({ message: "Invalid thread id." });
  }

  if (typeof question !== "string" || question.trim().length < 3) {
    return res.status(400).json({ message: "A valid question is required." });
  }

  const trimmed = question.trim();

  const thread = await fetchOwnedThread(userId, threadId);
  if (!thread) {
    return res.status(404).json({ message: "Thread not found." });
  }

  if (thread.is_archived) {
    return res.status(400).json({ message: "This chat is archived." });
  }

  const now = new Date().toISOString();
  const nextTitle =
    thread.title === "New chat" ? threadTitleFromFirstMessage(trimmed) : thread.title;

  const { data: userRow, error: uErr } = await supabase
    .from("knowledge_chat_messages")
    .insert({
      thread_id: thread.id,
      user_id: userId,
      role: "user",
      content: trimmed,
      sources: [],
    })
    .select("*")
    .single();

  if (uErr || !userRow) {
    console.error("[knowledge/chats] append_user", uErr?.message);
    return res.status(500).json({ message: "Could not save message." });
  }

  let clinicalBlock: string | null = null;
  if (thread.patient_id && thread.context_mode === "patient") {
    const bundle = await buildPatientKnowledgeContext(userId, thread.patient_id);
    if (bundle) clinicalBlock = formatClinicalContextPromptBlock(bundle);
  }

  const rag = await executeAyurvedicRag(
    trimmed,
    true,
    thread.rag_session_id,
    clinicalBlock
  );

  const { data: assistantRow, error: aErr } = await supabase
    .from("knowledge_chat_messages")
    .insert({
      thread_id: thread.id,
      user_id: userId,
      role: "assistant",
      content: rag.answer,
      sources: rag.sources,
      model: rag.model,
      error: rag.error,
    })
    .select("*")
    .single();

  if (aErr || !assistantRow) {
    console.error("[knowledge/chats] append_assistant", aErr?.message);
    return res.status(500).json({ message: "Could not save assistant reply." });
  }

  const { data: updatedThread, error: tErr } = await supabase
    .from("knowledge_chat_threads")
    .update({
      title: nextTitle,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", thread.id)
    .select("*")
    .single();

  const finalThread = tErr
    ? thread
    : normalizeThreadRow((updatedThread as Record<string, unknown>) ?? {});

  const patientMap = await fetchPatientSummariesMap(userId, [finalThread.patient_id]);

  return res.status(200).json({
    userMessage: userRow,
    assistantMessage: assistantRow,
    thread: threadApiSummary(finalThread, patientMap),
  });
});

router.delete("/knowledge/chats/:threadId", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const threadId = routeParam(req.params.threadId);

  if (!isUuid(threadId)) {
    return res.status(400).json({ message: "Invalid thread id." });
  }

  const thread = await fetchOwnedThread(userId, threadId);
  if (!thread) {
    return res.status(404).json({ message: "Thread not found." });
  }

  const { error } = await supabase
    .from("knowledge_chat_threads")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", userId);

  if (error) {
    console.error("[knowledge/chats] archive", error.message);
    return res.status(500).json({ message: "Could not archive chat." });
  }

  return res.status(200).json({ ok: true });
});

router.patch("/knowledge/chats/:threadId", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const threadId = routeParam(req.params.threadId);
  const body = req.body as {
    title?: unknown;
    patientId?: unknown;
    contextMode?: unknown;
  };

  if (!isUuid(threadId)) {
    return res.status(400).json({ message: "Invalid thread id." });
  }

  const hasTitle = typeof body.title === "string";
  const hasPatientKey = Object.prototype.hasOwnProperty.call(body, "patientId");
  const hasMode = typeof body.contextMode === "string";

  if (!hasTitle && !hasPatientKey && !hasMode) {
    return res.status(400).json({ message: "No updates provided." });
  }

  const thread = await fetchOwnedThread(userId, threadId);
  if (!thread) {
    return res.status(404).json({ message: "Thread not found." });
  }

  let nextPatient = thread.patient_id;
  let nextMode = thread.context_mode;

  if (hasMode && body.contextMode === "general") {
    nextPatient = null;
    nextMode = "general";
  }

  if (hasPatientKey) {
    const v = body.patientId;
    if (v === null) {
      nextPatient = null;
      nextMode = "general";
    } else if (typeof v === "string" && isUuid(v.trim())) {
      const ok = await fetchPatientForDoctor(userId, v.trim());
      if (!ok) {
        return res.status(403).json({ message: "Patient not found or access denied." });
      }
      nextPatient = v.trim();
      nextMode = "patient";
    } else {
      return res.status(400).json({ message: "Invalid patientId." });
    }
  }

  if (hasMode && body.contextMode === "patient") {
    const pid = nextPatient ?? thread.patient_id;
    if (!pid) {
      return res.status(400).json({
        message: "patientId is required to enable patient context mode.",
      });
    }
    nextPatient = pid;
    nextMode = "patient";
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    patient_id: nextPatient,
    context_mode: nextMode,
  };

  if (hasTitle) {
    const t = body.title as string;
    if (t.trim().length < 1) {
      return res.status(400).json({ message: "Title cannot be empty." });
    }
    updates.title = t.trim().slice(0, 200);
  }

  const { data: updated, error } = await supabase
    .from("knowledge_chat_threads")
    .update(updates)
    .eq("id", threadId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("[knowledge/chats] patch", error?.message);
    return res.status(500).json({ message: "Could not update chat." });
  }

  const row = normalizeThreadRow(updated as Record<string, unknown>);
  const patientMap = await fetchPatientSummariesMap(userId, [row.patient_id]);

  return res.status(200).json({ thread: threadApiSummary(row, patientMap) });
});

router.post("/knowledge", authMiddleware, async (req: Request, res: Response) => {
  const { question, useConversation, sessionId } = req.body as {
    question?: unknown;
    useConversation?: unknown;
    sessionId?: unknown;
  };

  if (typeof question !== "string" || question.trim().length < 3) {
    return res.status(400).json({ message: "A valid question is required." });
  }

  const trimmed = question.trim();
  const shouldUseConversation = useConversation === true;
  const sid = typeof sessionId === "string" ? sessionId.trim() : "";

  const out = await performRagRequest(trimmed, shouldUseConversation, shouldUseConversation ? sid : null);

  if (out.kind === "bad_request") {
    return res.status(400).json({ message: out.message });
  }
  if (out.kind === "upstream_502") {
    return res.status(502).json({ message: out.message });
  }
  if (out.kind === "not_found_passages") {
    return res.status(200).json({
      answer: "I couldn't find relevant Ayurvedic references for that question.",
      sources: [],
      model: null,
    });
  }

  return res.status(200).json({
    answer: out.answer,
    sources: out.sources,
    model: out.model,
  });
});

export default router;
