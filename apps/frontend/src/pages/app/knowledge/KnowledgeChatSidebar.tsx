import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Trash2, Pencil } from "lucide-react";
import type { KnowledgeChatThreadSummary } from "../../../services/api";
import { useToast } from "../../../components/toast/ToastContext";
import { formatRelativeTime } from "./formatRelativeTime";
import ConfirmDeleteChatDialog from "./ConfirmDeleteChatDialog";

interface KnowledgeChatSidebarProps {
  threads: KnowledgeChatThreadSummary[];
  activeThreadId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => void;
}

export default function KnowledgeChatSidebar({
  threads,
  activeThreadId,
  loading,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
}: KnowledgeChatSidebarProps) {
  const { showToast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [threadPendingDelete, setThreadPendingDelete] = useState<KnowledgeChatThreadSummary | null>(
    null
  );
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const startRename = (t: KnowledgeChatThreadSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(t.id);
    setRenameDraft(t.title);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const next = renameDraft.trim();
    if (next.length > 0) onRename(renamingId, next.slice(0, 200));
    setRenamingId(null);
  };

  const handleCancelDelete = useCallback(() => {
    if (deleteInProgress) return;
    setThreadPendingDelete(null);
  }, [deleteInProgress]);

  const handleConfirmDelete = useCallback(async () => {
    if (!threadPendingDelete || deleteInProgress) return;
    setDeleteInProgress(true);
    try {
      await onDelete(threadPendingDelete.id);
      setThreadPendingDelete(null);
    } catch {
      showToast("Could not delete chat. Please try again.", "error");
    } finally {
      setDeleteInProgress(false);
    }
  }, [threadPendingDelete, deleteInProgress, onDelete, showToast]);

  const patientBadgeLabel =
    threadPendingDelete?.context_mode === "patient"
      ? (threadPendingDelete.patientSummary?.name ?? "Patient chart")
      : null;

  const deleteDialog =
    typeof document !== "undefined"
      ? createPortal(
          <ConfirmDeleteChatDialog
            open={threadPendingDelete !== null}
            chatTitle={threadPendingDelete?.title ?? null}
            patientBadgeLabel={patientBadgeLabel}
            loading={deleteInProgress}
            onCancel={handleCancelDelete}
            onConfirm={() => void handleConfirmDelete()}
          />,
          document.body
        )
      : null;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-stone-200 bg-stone-50/80 dark:border-stone-700 dark:bg-stone-900/40 rounded-l-xl overflow-hidden">
      <div className="p-3 border-b border-stone-200 dark:border-stone-700">
        <button
          type="button"
          onClick={onNewChat}
          disabled={deleteInProgress}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors disabled:pointer-events-none disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-emerald-500"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
      </div>
      <div
        className={`flex-1 overflow-y-auto p-2 space-y-1 min-h-0 transition-opacity ${
          deleteInProgress && threadPendingDelete ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {loading && <p className="text-xs text-stone-400 px-2 py-3">Loading chats…</p>}
        {!loading && threads.length === 0 && (
          <p className="text-xs text-stone-400 px-2 py-3">No chats yet.</p>
        )}
        {!loading &&
          threads.map((t) => {
            const active = t.id === activeThreadId;
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(t.id);
                  }
                }}
                className={`group rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                  active
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                    : "border-transparent hover:bg-stone-100 dark:hover:bg-stone-800/80"
                }`}
              >
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  />
                ) : (
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate pr-6">
                    {t.title}
                  </p>
                )}
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {t.context_mode === "patient" && t.patientSummary?.name ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {t.patientSummary.name} ·{" "}
                    </span>
                  ) : null}
                  {formatRelativeTime(t.last_message_at)}
                </p>
                <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title="Rename"
                    onClick={(e) => startRename(t, e)}
                    className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThreadPendingDelete(t);
                    }}
                    className="rounded p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
      {deleteDialog}
    </aside>
  );
}
