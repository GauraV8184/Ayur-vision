import { useCallback, useEffect, useMemo, useState } from "react";

export const ONBOARDING_SEEN_KEY = "ayurvision_onboarding_seen";
const REPLAY_EVENT = "ayurvision:onboarding:replay";

function readSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSeen(seen: boolean): void {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, seen ? "true" : "false");
  } catch {
    // ignore storage failures (private mode, disabled storage, etc.)
  }
}

export function requestOnboardingReplay(): void {
  window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
}

export function useOnboarding() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<boolean>(() => readSeen());

  // Auto-start the first time a user enters the authenticated app.
  useEffect(() => {
    const current = readSeen();
    setSeen(current);
    if (!current) setOpen(true);
  }, []);

  // Allow manual replay from Settings/Profile without coupling to page state.
  useEffect(() => {
    const onReplay = () => setOpen(true);
    window.addEventListener(REPLAY_EVENT, onReplay as EventListener);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay as EventListener);
  }, []);

  const complete = useCallback(() => {
    writeSeen(true);
    setSeen(true);
    setOpen(false);
  }, []);

  const skip = useCallback(() => {
    // Skipping is treated as "seen" so it does not auto-appear again.
    writeSeen(true);
    setSeen(true);
    setOpen(false);
  }, []);

  const start = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return useMemo(
    () => ({
      open,
      seen,
      start,
      close,
      complete,
      skip,
    }),
    [open, seen, start, close, complete, skip]
  );
}

