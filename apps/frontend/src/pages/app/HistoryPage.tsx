const mockHistory = [
  {
    id: 1,
    title: "Neem leaf analysis",
    subtitle: "Image-based identification and dosha impact",
    date: "Today, 10:24",
    status: "Completed",
  },
  {
    id: 2,
    title: "Triphala formulation review",
    subtitle: "Herbal recommendation and contraindication check",
    date: "Yesterday, 17:08",
    status: "Completed",
  },
  {
    id: 3,
    title: "Patient dosha profile",
    subtitle: "Vata–Pitta dominant prakriti assessment",
    date: "2 days ago",
    status: "In review",
  },
];

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          History
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Recent analyses, predictions, and Ayurvedic insights you&apos;ve run in AyurVision AI.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Activity history
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          This is a preview of how your clinical history will look. Future versions will show
          full patient-linked records and filters.
        </p>

        <ul className="mt-4 space-y-3">
          {mockHistory.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {item.subtitle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-500 dark:text-stone-400">{item.date}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {item.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

