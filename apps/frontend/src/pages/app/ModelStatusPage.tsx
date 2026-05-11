import { useEffect, useState } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

const STATIC_MODELS = [
  { name: "Prakriti classifier", status: "active", detail: null },
  { name: "Disease prediction", status: "active", detail: null },
  { name: "Dosha imbalance", status: "active", detail: null },
  { name: "Herbal recommender", status: "active", detail: null },
];

export default function ModelStatusPage() {
  const [aiStatus, setAiStatus] = useState("checking");

  useEffect(() => {
    const AI_URL = import.meta.env.VITE_AI_URL || "http://localhost:5000";
    fetch(`${AI_URL}/health`)
      .then((r) => (r.ok ? setAiStatus("active") : setAiStatus("unavailable")))
      .catch(() => setAiStatus("unavailable"));
  }, []);

  const allModels = [
    {
      name: "Plant leaf classifier (EfficientNetB0 + TTA)",
      status: aiStatus,
      detail:
        aiStatus === "active"
          ? "Fine-tuned · TTA enabled · Background removal"
          : null,
    },
    ...STATIC_MODELS,
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Model status
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          AI model availability and health.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <ul className="space-y-4">
          {allModels.map((m) => (
            <li
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-stone-100 py-3 px-4 dark:border-stone-700"
            >
              <div>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {m.name}
                </span>
                {m.detail && (
                  <p className="text-xs text-stone-400 mt-0.5">{m.detail}</p>
                )}
              </div>
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  m.status === "active"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : m.status === "checking"
                    ? "text-amber-500"
                    : "text-red-500"
                }`}
              >
                {m.status === "checking" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : m.status === "active" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {m.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
