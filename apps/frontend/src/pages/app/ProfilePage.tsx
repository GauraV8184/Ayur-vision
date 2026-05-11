import { useAuth } from "../../contexts/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Profile
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Basic account details for your AyurVision AI profile.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Account information
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          These details are linked to your Supabase account.
        </p>

        {user ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40">
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                Name
              </span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {user.name || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40">
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                Email
              </span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {user.email || "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
            No user information available. Try refreshing the page or signing in again.
          </p>
        )}
      </section>
    </div>
  );
}

