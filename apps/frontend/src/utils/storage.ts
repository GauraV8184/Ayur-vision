export const STORAGE_KEYS = {
  latestDiagnosis: "ayurvision.latestDiagnosis",
  activityFeed: "ayurvision.activityFeed",
};

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function prependActivity<T>(item: T, limit = 25): T[] {
  const current = getJSON<T[]>(STORAGE_KEYS.activityFeed, []);
  const next = [item, ...current].slice(0, limit);
  setJSON(STORAGE_KEYS.activityFeed, next);
  return next;
}

