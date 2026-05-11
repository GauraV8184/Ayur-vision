import { useState } from "react";
import { Loader2, BookOpen, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { KnowledgeSource } from "../../../services/api";
import type { ChatMessage } from "./types";

function SourceCard({ source }: { source: KnowledgeSource }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{source.title}</span>
          <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-xs text-stone-500 dark:bg-stone-700 dark:text-stone-400 capitalize">
            {source.source}
          </span>
          {typeof source.page === "number" && (
            <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-xs text-stone-500 dark:bg-stone-700 dark:text-stone-400">
              p. {source.page}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {expanded && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{source.excerpt}</p>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
}: {
  msg: ChatMessage;
}) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}
      >
        {msg.role === "user" ? (
          <div className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm leading-relaxed text-white rounded-br-sm">
            {msg.content}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-800 rounded-bl-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
            {msg.content}
          </div>
        )}
        {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-xs text-stone-400 px-1">Sources</p>
            {msg.sources.map((s, i) => (
              <SourceCard key={i} source={s} />
            ))}
          </div>
        )}
        {msg.error && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" />
            {msg.error}
          </div>
        )}
        {msg.model && (
          <p className="text-xs text-stone-300 px-1">via {msg.model}</p>
        )}
      </div>
    </div>
  );
}

interface KnowledgeMessageListProps {
  messages: ChatMessage[];
  loadingReply: boolean;
  loadingThread: boolean;
  showSuggestedChips: boolean;
  suggestedQuestions: string[];
  onSuggestedClick: (q: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  /** Optional subtle cue when thread is linked to a patient chart */
  patientContextBanner?: string | null;
}

export default function KnowledgeMessageList({
  messages,
  loadingReply,
  loadingThread,
  showSuggestedChips,
  suggestedQuestions,
  onSuggestedClick,
  bottomRef,
  patientContextBanner,
}: KnowledgeMessageListProps) {
  return (
    <>
      {showSuggestedChips && (
        <div className="mb-4 shrink-0 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSuggestedClick(q)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-0">
        {!loadingThread && patientContextBanner && messages.length > 0 && (
          <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">
            Using patient context: {patientContextBanner}
          </p>
        )}
        {loadingThread && (
          <div className="flex justify-center py-8 text-sm text-stone-400">Loading conversation…</div>
        )}
        {!loadingThread &&
          messages.map((msg, i) => (
            <MessageBubble key={msg.id ?? `${msg.role}-${i}-${msg.content.slice(0, 24)}`} msg={msg} />
          ))}
        {!loadingThread && loadingReply && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span className="text-sm text-stone-500">Searching knowledge base...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </>
  );
}
