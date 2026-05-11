import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecognitionHook = {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  error: string | null;
  clearError: () => void;
  startListening: () => void;
  stopListening: () => void;
};

type RecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone permission denied. Allow access in your browser settings to use voice input.";
    case "no-speech":
      return "No speech detected. Speak closer to the mic or try again.";
    case "audio-capture":
      return "No microphone found or it could not be opened.";
    case "network":
      return "Voice recognition needs a network connection. Check your connection and try again.";
    case "aborted":
      return "";
    case "service-not-allowed":
      return "Speech recognition isn’t allowed in this context.";
    default:
      return "Voice input failed. You can still type your message.";
  }
}

export type UseSpeechRecognitionOptions = {
  /** Called with cumulative transcript for this session (final + current interim). */
  onTranscript: (text: string) => void;
  /** BCP-47 tag; defaults to browser language or English. */
  lang?: string;
};

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): SpeechRecognitionHook {
  const { lang: langOption } = options;
  const onTranscriptRef = useRef(options.onTranscript);
  onTranscriptRef.current = options.onTranscript;

  const [isSupported] = useState(() => getRecognitionCtor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const intentionalStopRef = useRef(false);

  const tearDownRecognition = useCallback(() => {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      try {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.onstart = null;
        r.stop();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    const r = recognitionRef.current;
    if (r) {
      setIsProcessing(true);
      try {
        r.stop();
      } catch {
        recognitionRef.current = null;
        setIsListening(false);
        setIsProcessing(false);
      }
    } else {
      setIsListening(false);
      setIsProcessing(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn’t available in this browser. Try Chrome or Edge over HTTPS.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Voice input requires a secure (HTTPS) connection.");
      return;
    }

    tearDownRecognition();
    intentionalStopRef.current = false;
    finalTranscriptRef.current = "";
    setError(null);

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang =
      langOption?.trim() ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += piece;
        } else {
          interim += piece;
        }
      }
      onTranscriptRef.current(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = errorMessage(event.error);
      if (msg) setError(msg);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        intentionalStopRef.current = true;
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setIsProcessing(false);
    };

    try {
      recognition.start();
    } catch {
      setError("Could not start voice input. Try again.");
      setIsListening(false);
      setIsProcessing(false);
      recognitionRef.current = null;
    }
  }, [tearDownRecognition, langOption]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      tearDownRecognition();
    };
  }, [tearDownRecognition]);

  return {
    isListening,
    isProcessing,
    isSupported,
    error,
    clearError,
    startListening,
    stopListening,
  };
}
