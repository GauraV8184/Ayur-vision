import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Loader2, Mic, MicOff, Send } from "lucide-react";
import { useSpeechRecognition } from "../../../hooks/useSpeechRecognition";

interface KnowledgeComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function KnowledgeComposer({
  value,
  onChange,
  onSend,
  loading,
  disabled,
}: KnowledgeComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prefixRef = useRef("");
  const wasListeningRef = useRef(false);

  const speechLang = useMemo(
    () => (typeof navigator !== "undefined" ? navigator.language : "en-US"),
    []
  );

  const applySpeech = useCallback(
    (speech: string) => {
      const p = prefixRef.current;
      const glue =
        p.length > 0 && !/\s$/.test(p) && speech.length > 0 && !/^\s/.test(speech) ? " " : "";
      onChange(p + glue + speech);
    },
    [onChange]
  );

  const {
    isListening,
    isProcessing,
    isSupported,
    error: speechError,
    clearError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscript: applySpeech,
    lang: speechLang,
  });

  const toggleMic = useCallback(() => {
    if (!isSupported || disabled || loading) return;
    if (isListening || isProcessing) {
      stopListening();
    } else {
      clearError();
      prefixRef.current = value;
      startListening();
    }
  }, [
    isSupported,
    disabled,
    loading,
    isListening,
    isProcessing,
    stopListening,
    startListening,
    clearError,
    value,
  ]);

  const toggleMicRef = useRef(toggleMic);
  toggleMicRef.current = toggleMic;

  useEffect(() => {
    if (!isSupported) return;
    const onShortcut = (e: globalThis.KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key !== "m" && e.key !== "M") return;
      if (disabled || loading) return;
      e.preventDefault();
      toggleMicRef.current();
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [isSupported, disabled, loading]);

  useEffect(() => {
    if (isListening) wasListeningRef.current = true;
    if (wasListeningRef.current && !isListening && !isProcessing) {
      wasListeningRef.current = false;
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isListening, isProcessing]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const micDisabled = !!disabled || loading;
  const showMicSpinner = isProcessing;
  const showMicRecording = isListening && !isProcessing;

  return (
    <div className="shrink-0 pt-2">
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {showMicRecording ? "Listening. Press the microphone button or Control Shift M to stop." : ""}
      </div>

      {(showMicRecording || speechError) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {showMicRecording && (
            <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500"
                aria-hidden
              />
              Listening…
            </div>
          )}
          {speechError ? (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <span>{speechError}</span>
              <button
                type="button"
                onClick={clearError}
                className="rounded-md px-1.5 py-0.5 font-medium text-stone-600 underline-offset-2 hover:underline dark:text-stone-300"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any ayurvedic plant..."
          rows={1}
          disabled={disabled || loading || isListening}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-stone-800 placeholder-stone-400 outline-none dark:text-stone-200 disabled:opacity-50"
        />
        {isSupported ? (
          <button
            type="button"
            onClick={toggleMic}
            disabled={micDisabled}
            title="Voice input (Ctrl+Shift+M)"
            aria-label={
              showMicSpinner
                ? "Stopping voice input"
                : showMicRecording
                  ? "Stop recording"
                  : "Start voice input"
            }
            aria-pressed={showMicRecording}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              showMicSpinner
                ? "bg-stone-200 text-stone-700 dark:bg-stone-600 dark:text-stone-100"
                : showMicRecording
                  ? "animate-pulse bg-red-500 text-white shadow-sm dark:bg-red-600"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
            }`}
          >
            {showMicSpinner ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : showMicRecording ? (
              <MicOff className="h-4 w-4" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onSend()}
          disabled={!!disabled || loading || !value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-1.5 space-y-1 text-center text-xs text-stone-400">
        {!isSupported ? (
          <p className="text-stone-500 dark:text-stone-400">
            Voice input isn’t available in this browser. Use Chrome or Edge over HTTPS, or type your
            question above.
          </p>
        ) : null}
        <p>
          Grounded on your ingested Ayurvedic corpus (Qdrant RAG). Always consult a practitioner for
          medical advice.
        </p>
      </div>
    </div>
  );
}
