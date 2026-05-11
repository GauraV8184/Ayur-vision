import { useMemo } from "react";
import {
  Users,
  Activity,
  Cpu,
  Leaf,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  systemMetrics,
  doshaDistribution,
  symptomFrequency,
  diseasePredictions,
  treatmentFrequency,
  recentActivity,
} from "../../__mocks__/mockDashboard";
import { cn } from "../../utils/cn";
import { getJSON, STORAGE_KEYS } from "../../utils/storage";

const iconMap = { users: Users, activity: Activity, cpu: Cpu, leaf: Leaf };

export default function DashboardPage() {
  const stored = getJSON(STORAGE_KEYS.activityFeed, []);
  const activity = useMemo(() => {
    // Prefer stored activity (from running mock AI); fallback to static list
    return (stored && stored.length ? stored : recentActivity).slice(0, 8);
  }, [stored]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          AI-powered clinical decision support at a glance.
        </p>
      </div>

      {/* System metrics */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          System metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {systemMetrics.map((m) => {
            const Icon =
              iconMap[m.icon as keyof typeof iconMap] || Activity;
            return (
              <div
                key={m.label}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-card transition-shadow hover:shadow-soft dark:border-stone-700 dark:bg-stone-800/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                    {m.label}
                  </span>
                  <Icon className="h-5 w-5 text-herbal-forest dark:text-sage-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                  {m.value}
                </p>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  {m.change}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Dosha distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={doshaDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {doshaDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Most common symptoms
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptomFrequency} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2d5a3d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Disease prediction statistics
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseasePredictions} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6b7c5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Treatment recommendation frequency
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={treatmentFrequency} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#5c7a6b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <TrendingUp className="h-4 w-4" />
          Recent activity
        </h3>
        <ul className="space-y-3">
          {activity.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-stone-100 py-3 px-4 dark:border-stone-700"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    a.type === "diagnosis" && "bg-herbal-forest/15 text-herbal-forest",
                    a.type === "analysis" && "bg-sage-500/15 text-sage-700 dark:text-sage-300",
                    a.type === "prediction" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                    a.type === "recommendation" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  )}
                >
                  {a.action}
                </span>
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {a.patient}
                </span>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">{a.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
