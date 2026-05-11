import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  KnowledgeChatMessageRecord,
  KnowledgeSource,
  KnowledgeChatThreadSummary,
} from "../../services/api";
import {
  listKnowledgeChats,
  createKnowledgeChat,
  getKnowledgeChatMessages,
  sendKnowledgeChatMessage,
  deleteKnowledgeChat,
  renameKnowledgeChat,
  updateKnowledgeChat,
} from "../../services/api";
import { usePatients } from "../../hooks/usePatients";
import KnowledgeChatSidebar from "./knowledge/KnowledgeChatSidebar";
import KnowledgeMessageList from "./knowledge/KnowledgeMessageList";
import KnowledgeComposer from "./knowledge/KnowledgeComposer";
import KnowledgePatientContextBar from "./knowledge/KnowledgePatientContextBar";
import KnowledgePatientPicker from "./knowledge/KnowledgePatientPicker";
import type { ChatMessage } from "./knowledge/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidParam(id: string | null): id is string {
  return typeof id === "string" && UUID_RE.test(id.trim());
}

function normalizeThread(t: KnowledgeChatThreadSummary): KnowledgeChatThreadSummary {
  return {
    ...t,
    context_mode: t.context_mode ?? "general",
    patient_id: t.patient_id ?? null,
    patientSummary: t.patientSummary ?? null,
  };
}

const SUGGESTED_QUESTIONS = [
  "What are the Panchakarma procedures and their indications?",
  "Dosage and contraindications for Trikatu Churna?",
  "How to treat Amavata (Rheumatoid Arthritis) in Ayurveda?",
  "What are the drug interactions of Guggulu?",
  "Explain Dinacharya — the Ayurvedic daily routine",
  "What foods aggravate Vata dosha?",
  "Difference between Vataja and Pittaja Jwara treatment?",
  "How is Chyawanprash prepared and what are its benefits?",
];

const WELCOME_GENERAL =
  "Hello! I'm the AyurVision knowledge assistant. Ask me anything about Ayurvedic plants — medicinal uses, preparation methods, dosages, or interactions.";

const WELCOME_PATIENT =
  "Hello! This thread is linked to a patient chart. Ask clinical questions grounded in their profile — I'll combine chart facts with retrieved Ayurvedic sources and flag missing information.";

function parseSources(raw: unknown): KnowledgeSource[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: KnowledgeSource[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "title" in item &&
      typeof (item as KnowledgeSource).title === "string"
    ) {
      out.push(item as KnowledgeSource);
    }
  }
  return out.length ? out : undefined;
}

function recordToChatMessage(r: KnowledgeChatMessageRecord): ChatMessage {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    sources: parseSources(r.sources),
    model: r.model ?? undefined,
    error: r.error ?? undefined,
  };
}

export default function KnowledgeAssistantPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState<KnowledgeChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { patients, loading: patientsLoading } = usePatients();

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const initialBootstrapCaptured = useRef(false);
  const initialChatQuery = useRef<string | null>(null);
  const initialPatientQuery = useRef<string | null>(null);
  if (!initialBootstrapCaptured.current) {
    initialBootstrapCaptured.current = true;
    initialChatQuery.current = searchParams.get("chat");
    initialPatientQuery.current = searchParams.get("patient");
  }

  const syncChatQuery = useCallback(
    (threadId: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (threadId) next.set("chat", threadId);
          else next.delete("chat");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const syncPatientQuery = useCallback(
    (patientId: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patientId) next.set("patient", patientId);
          else next.delete("patient");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  /** Initial load: threads, optional ?chat= / ?patient= deep links */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setListLoading(true);
      try {
        let loaded = (await listKnowledgeChats()).data?.threads ?? [];
        loaded = loaded.map(normalizeThread);

        const chatParam = initialChatQuery.current;
        const patientParam = initialPatientQuery.current;

        if (!cancelled && loaded.length === 0) {
          if (patientParam && isUuidParam(patientParam)) {
            const cr = await createKnowledgeChat({
              contextMode: "patient",
              patientId: patientParam.trim(),
            });
            if (cr.data?.thread) loaded = [normalizeThread(cr.data.thread)];
          } else {
            const cr = await createKnowledgeChat();
            if (cr.data?.thread) loaded = [normalizeThread(cr.data.thread)];
          }
        }

        if (cancelled) return;
        setThreads(loaded);

        let pick = loaded[0]?.id ?? null;

        if (chatParam && isUuidParam(chatParam) && loaded.some((t) => t.id === chatParam)) {
          pick = chatParam;
        } else if (patientParam && isUuidParam(patientParam)) {
          const existing = loaded.find(
            (t) => t.context_mode === "patient" && t.patient_id === patientParam.trim()
          );
          if (existing) {
            pick = existing.id;
          } else {
            const cr = await createKnowledgeChat({
              contextMode: "patient",
              patientId: patientParam.trim(),
            });
            const t = cr.data?.thread;
            if (t) {
              const nt = normalizeThread(t);
              loaded = [nt, ...loaded.filter((x) => x.id !== nt.id)];
              if (!cancelled) setThreads(loaded);
              pick = nt.id;
            }
          }
        }

        if (cancelled) return;

        setActiveThreadId(pick);
        if (pick) {
          syncChatQuery(pick);
          const sel = loaded.find((x) => x.id === pick);
          if (sel?.patient_id && sel.context_mode === "patient") {
            syncPatientQuery(sel.patient_id);
          } else {
            syncPatientQuery(null);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setThreads([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount bootstrap; refs hold initial URL
  }, []);

  /** Load messages when active thread changes */
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    const threadId = activeThreadId;
    let cancelled = false;
    setMessages([]);

    async function loadMsgs() {
      setThreadLoading(true);
      try {
        const { data } = await getKnowledgeChatMessages(threadId);
        if (cancelled) return;

        if (data?.thread) {
          const nt = normalizeThread(data.thread);
          setThreads((prev) => {
            const rest = prev.filter((t) => t.id !== nt.id);
            return [nt, ...rest];
          });
        }

        const rows = data?.messages ?? [];
        const threadMeta = data?.thread;

        if (rows.length === 0) {
          const welcome =
            threadMeta?.context_mode === "patient" ? WELCOME_PATIENT : WELCOME_GENERAL;
          setMessages([
            {
              role: "assistant",
              content: welcome,
              isLocalWelcome: true,
            },
          ]);
          return;
        }

        setMessages(rows.map(recordToChatMessage));
      } catch (err: unknown) {
        const ax = err as { response?: { status?: number } };
        if (ax.response?.status === 404) {
          const fresh = await listKnowledgeChats();
          const nextThreads = (fresh.data?.threads ?? []).map(normalizeThread);
          if (!cancelled) setThreads(nextThreads);
          const fallback = nextThreads[0]?.id ?? null;
          if (!cancelled) {
            setActiveThreadId(fallback);
            if (fallback) syncChatQuery(fallback);
          }
          return;
        }
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    }

    void loadMsgs();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, syncChatQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendLoading, threadLoading]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId]
  );

  const patientBannerName =
    activeThread?.context_mode === "patient"
      ? activeThread.patientSummary?.name ?? "Patient"
      : null;

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    syncChatQuery(id);
    const sel = threads.find((t) => t.id === id);
    if (sel?.patient_id && sel.context_mode === "patient") {
      syncPatientQuery(sel.patient_id);
    } else {
      syncPatientQuery(null);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data } = await createKnowledgeChat();
      const t = data?.thread;
      if (!t) return;
      const nt = normalizeThread(t);
      setThreads((prev) => [nt, ...prev.filter((x) => x.id !== nt.id)]);
      setActiveThreadId(nt.id);
      syncChatQuery(nt.id);
      syncPatientQuery(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKnowledgeChat(id);
      const { data } = await listKnowledgeChats();
      let list = (data?.threads ?? []).map(normalizeThread);
      if (list.length === 0) {
        const created = await createKnowledgeChat();
        if (created.data?.thread) list = [normalizeThread(created.data.thread)];
      }
      setThreads(list);

      if (activeThreadId === id) {
        const nextId = list[0]?.id ?? null;
        setActiveThreadId(nextId);
        if (nextId) {
          syncChatQuery(nextId);
          const sel = list.find((t) => t.id === nextId);
          if (sel?.patient_id && sel.context_mode === "patient") {
            syncPatientQuery(sel.patient_id);
          } else {
            syncPatientQuery(null);
          }
        } else {
          syncChatQuery(null);
          syncPatientQuery(null);
        }
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      const { data } = await renameKnowledgeChat(id, { title });
      const updated = data?.thread;
      if (!updated) return;
      setThreads((prev) => prev.map((t) => (t.id === id ? normalizeThread(updated) : t)));
    } catch (e) {
      console.error(e);
    }
  };

  const applyPatientToThread = async (patientId: string) => {
    if (!activeThreadId) return;
    try {
      const { data } = await updateKnowledgeChat(activeThreadId, {
        patientId,
        contextMode: "patient",
      });
      const updated = data?.thread;
      if (!updated) return;
      const nt = normalizeThread(updated);
      setThreads((prev) => [nt, ...prev.filter((t) => t.id !== nt.id)]);
      syncPatientQuery(patientId);
    } catch (e) {
      console.error(e);
    }
  };

  const clearPatientFromThread = async () => {
    if (!activeThreadId) return;
    try {
      const { data } = await updateKnowledgeChat(activeThreadId, {
        patientId: null,
        contextMode: "general",
      });
      const updated = data?.thread;
      if (!updated) return;
      const nt = normalizeThread(updated);
      setThreads((prev) => [nt, ...prev.filter((t) => t.id !== nt.id)]);
      syncPatientQuery(null);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (question?: string) => {
    const text = (question ?? "").trim();
    if (!text || sendLoading || !activeThreadId || threadLoading) return;

    setSendLoading(true);

    setMessages((prev) => {
      const base = prev.filter((m) => !m.isLocalWelcome);
      return [...base, { role: "user", content: text }];
    });

    try {
      const { data } = await sendKnowledgeChatMessage(activeThreadId, { question: text });
      if (!data) throw new Error("No response");

      const userMsg = recordToChatMessage(data.userMessage);
      const asstMsg = recordToChatMessage(data.assistantMessage);

      setMessages((prev) => {
        const base = prev.filter((m) => !m.isLocalWelcome);
        const trimmed =
          base.length > 0 &&
          base[base.length - 1].role === "user" &&
          base[base.length - 1].content === text
            ? base.slice(0, -1)
            : base;
        return [...trimmed, userMsg, asstMsg];
      });

      setThreads((prev) => {
        const rest = prev.filter((t) => t.id !== data.thread.id);
        return [normalizeThread(data.thread), ...rest];
      });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string; error?: string } };
      };
      if (axiosErr.response?.status === 401) {
        setMessages((prev) => {
          const base = prev.filter((m) => !m.isLocalWelcome);
          const trimmed =
            base.length > 0 &&
            base[base.length - 1].role === "user" &&
            base[base.length - 1].content === text
              ? base.slice(0, -1)
              : base;
          return [
            ...trimmed,
            {
              role: "assistant",
              content: "Sorry, I couldn't process that question.",
              error: "Session expired. Please log in again.",
            },
          ];
        });
        setTimeout(() => navigate("/login"), 800);
        return;
      }
      const errMsg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        "Could not reach the knowledge service.";
      setMessages((prev) => {
        const base = prev.filter((m) => !m.isLocalWelcome);
        const trimmed =
          base.length > 0 &&
          base[base.length - 1].role === "user" &&
          base[base.length - 1].content === text
            ? base.slice(0, -1)
            : base;
        return [
          ...trimmed,
          { role: "user", content: text },
          {
            role: "assistant",
            content: "Sorry, I couldn't process that question.",
            error: errMsg,
          },
        ];
      });
    } finally {
      setSendLoading(false);
    }
  };

  const [input, setInput] = useState("");

  const hasUserMessages = messages.some((m) => m.role === "user");
  const showSuggested =
    !threadLoading && !hasUserMessages && messages.some((m) => m.isLocalWelcome);

  const onSendClick = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    void sendMessage(t);
  };

  const patientDisplayName =
    activeThread?.patientSummary?.name ??
    (activeThread?.patient_id
      ? patients.find((p) => p.id === activeThread.patient_id)?.name
      : null);

  const ctxBusy = sendLoading || threadLoading || listLoading;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-0 flex-col md:flex-row">
      <KnowledgeChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        loading={listLoading}
        onSelect={handleSelectThread}
        onNewChat={() => void handleNewChat()}
        onDelete={handleDelete}
        onRename={(id, title) => void handleRename(id, title)}
      />

      <div className="flex flex-1 min-w-0 flex-col border border-stone-200 dark:border-stone-700 rounded-xl bg-white/50 dark:bg-stone-950/30 p-4 md:border-l-0 md:rounded-l-none">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Knowledge Assistant
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Ask about medicinal uses, dosages, preparations, and interactions — optionally with a
            patient chart for clinical context.
          </p>
        </div>

        <KnowledgePatientContextBar
          contextMode={activeThread?.context_mode ?? "general"}
          patientDisplayName={patientDisplayName}
          disabled={!activeThreadId || ctxBusy}
          onOpenPicker={() => setPickerOpen(true)}
          onClearPatient={() => void clearPatientFromThread()}
        />

        <KnowledgeMessageList
          messages={messages}
          loadingReply={sendLoading}
          loadingThread={threadLoading}
          showSuggestedChips={showSuggested}
          suggestedQuestions={SUGGESTED_QUESTIONS}
          onSuggestedClick={(q) => void sendMessage(q)}
          bottomRef={bottomRef}
          patientContextBanner={patientBannerName}
        />

        <KnowledgeComposer
          value={input}
          onChange={setInput}
          onSend={onSendClick}
          loading={sendLoading}
          disabled={!activeThreadId || threadLoading || listLoading}
        />
      </div>

      <KnowledgePatientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        patients={patients}
        loading={patientsLoading}
        onSelect={(id) => void applyPatientToThread(id)}
      />
    </div>
  );
}
