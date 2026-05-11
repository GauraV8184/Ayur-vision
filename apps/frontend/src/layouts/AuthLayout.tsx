import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Public pages must always be light.
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-herbal-cream dark:bg-stone-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white/80 px-6 backdrop-blur dark:border-stone-700 dark:bg-stone-900/80">
        <Link to="/" className="text-lg font-semibold text-herbal-forest dark:text-sage-400">
          AyurVision AI
        </Link>
        <nav className="flex gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-stone-600 hover:text-herbal-forest dark:text-stone-400 dark:hover:text-sage-400"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium text-stone-600 hover:text-herbal-forest dark:text-stone-400 dark:hover:text-sage-400"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="auth-page-inner w-full max-w-[420px]">
          {children}
        </div>
      </main>
    </div>
  );
}
