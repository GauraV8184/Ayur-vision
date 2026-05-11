import { useState, useLayoutEffect } from "react";

const THEME_KEY = "theme";

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function isThemeSuppressed() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("pdf-export");
}

function isAuthenticatedFromStorage() {
  if (typeof window === "undefined") return false;

  // Simple token-based auth (if your app ever uses it)
  if (window.localStorage.getItem("token")) return true;

  // Supabase persists session in localStorage with an `*-auth-token` key.
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.includes("auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      if (raw.includes("access_token") || raw.includes("refresh_token")) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    if (!isAuthenticatedFromStorage()) return "light";

    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return getSystemTheme();
  });

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (isThemeSuppressed()) return;

    const root = document.documentElement;
    const isAuthenticated = isAuthenticatedFromStorage();

    if (!isAuthenticated) {
      root.classList.remove("dark");
      return;
    }

    window.localStorage.setItem(THEME_KEY, theme);
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggleTheme };
}
