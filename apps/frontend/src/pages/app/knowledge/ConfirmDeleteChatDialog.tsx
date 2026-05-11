import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export type ConfirmDeleteChatDialogProps = {
  open: boolean;
  title?: string;
  chatTitle?: string | null;
  patientBadgeLabel?: string | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteChatDialog({
  open,
  title = "Delete chat?",
  chatTitle,
  patientBadgeLabel,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteChatDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 transition-opacity duration-200 ease-out ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-chat-title"
        aria-describedby="confirm-delete-chat-desc"
        tabIndex={-1}
        className={`w-full max-w-md rounded-xl border border-stone-200 bg-white shadow-xl outline-none transition-all duration-200 ease-out dark:border-stone-700 dark:bg-stone-900 ${
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        <div className="p-5">
          <div className="flex gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
              aria-hidden
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="confirm-delete-chat-title"
                className="text-base font-semibold text-stone-900 dark:text-stone-100"
              >
                {title}
              </h2>
              <p
                id="confirm-delete-chat-desc"
                className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400"
              >
                This chat will be removed from your history. This action cannot be undone.
              </p>
              {chatTitle ? (
                <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-200">
                  <span className="text-stone-500 dark:text-stone-400">Chat: </span>
                  <span className="break-words">{chatTitle}</span>
                </p>
              ) : null}
              {patientBadgeLabel ? (
                <p className="mt-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Patient: {patientBadgeLabel}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-70 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {loading ? "Deleting…" : "Delete chat"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
