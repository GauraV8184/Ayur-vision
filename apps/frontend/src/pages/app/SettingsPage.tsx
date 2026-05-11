import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import Button from "../../components/ui/Button";
import { requestOnboardingReplay } from "../../hooks/useOnboarding";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          System settings
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Preferences and appearance.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 text-lg font-medium text-stone-800 dark:text-stone-200">
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600 dark:text-stone-300">Dark mode</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-1 text-lg font-medium text-stone-800 dark:text-stone-200">
          Onboarding
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Replay a short guided tour of key features.
        </p>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={requestOnboardingReplay}>
            Replay App Tour
          </Button>
        </div>
      </div>
    </div>
  );
}
