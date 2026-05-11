import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, User, Command, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const THEME_KEY = "theme";

export default function TopBar({
  onCommandOpen,
  className = "",
}: {
  onCommandOpen: () => void;
  className?: string;
  sidebarOpen?: boolean;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    document.documentElement.classList.remove("dark");
    localStorage.removeItem(THEME_KEY);
    navigate("/login", { replace: true });
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onCommandOpen();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onCommandOpen]);

  return (
    <header className={`flex h-14 shrink-0 items-center gap-4 border-b border-stone-200 bg-white/80 px-6 backdrop-blur dark:border-stone-700 dark:bg-stone-900/80 ${className}`}>
      <button
        type="button"
        onClick={onCommandOpen}
        className="flex flex-1 max-w-xl items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-left text-sm text-stone-500 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700 dark:focus:ring-sage-500/20"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Search patients, herbs, actions...</span>
        <kbd className="ml-auto hidden rounded bg-stone-200 px-1.5 py-0.5 text-xs font-medium dark:bg-stone-600 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCommandOpen}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          title="Command palette (Ctrl+K)"
        >
          <Command className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-herbal-forest" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 pl-1 pr-2 py-1 dark:border-stone-600 dark:bg-stone-800"
          title="Doctor profile"
          data-tour="topbar-profile"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-herbal-forest/20 text-herbal-forest dark:bg-sage-500/20 dark:text-sage-300">
            <User className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-medium text-stone-700 dark:text-stone-300 sm:inline">
            {user?.name ?? "User"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
