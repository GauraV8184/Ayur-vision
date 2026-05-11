import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { cn } from "../../utils/cn";
import { getJSON, STORAGE_KEYS } from "../../utils/storage";
import { FileText, Leaf } from "lucide-react";
import ConfidenceIndicator from "../../components/ui/ConfidenceIndicator";

interface DoshaEntry { level: number; status: string; label: string; }

interface PatientData {
  name?: string;
  age?: string | number | null;
  gender?: string | null;
}

interface PrakritiData {
  vata?: number;
  pitta?: number;
  kapha?: number;
  vata_pct?: number;
  pitta_pct?: number;
  kapha_pct?: number;
  dominant?: string;
  dominantDosha?: string;
  dominant_dosha?: string;
  confidence?: number | null;
  confidence_pct?: number | null;
  lowConfidence?: boolean;
  interpretation?: string | null;
  topFeatures?: { feature: string; importance: number }[];
  top_features?: { feature: string; importance: number }[];
  allClassProbabilities?: Record<string, number> | null;
  /** Set when Prakriti came from the live API (vs mock fallback). */
  source?: string;
}

interface DiseasePrediction {
  condition: string;
  probability: number;
  explanation: string;
}

interface HerbRecommendation {
  id?: string | number;
  plantName: string;
  therapeuticUses: string;
  preparation: string;
  botanicalName?: string;
  doshaEffect?: string;
  cautions?: string[];
  imagePlaceholder?: string;
}

interface DietLifestyle {
  recommended: string[];
  avoid: string[];
  lifestyle: string[];
  dailyRoutine: string[];
}

interface LatestDiagnosisData {
  patient?: PatientData | null;
  prakriti: PrakritiData;
  diseasePredictions: DiseasePrediction[];
  doshaImbalance: Record<string, DoshaEntry>;
  herbalRecommendations: HerbRecommendation[];
  dietLifestyle: DietLifestyle;
}

export default function PredictionResultsPage() {
  const navigate = useNavigate();
  const latest = getJSON<LatestDiagnosisData | null>(
    STORAGE_KEYS.latestDiagnosis,
    null
  );

  const hasRequiredFields = (x: LatestDiagnosisData | null): x is LatestDiagnosisData => {
    if (!x) return false;
    if (!x.prakriti || typeof x.prakriti !== "object") return false;
    if (!Array.isArray(x.diseasePredictions)) return false;
    if (!x.doshaImbalance || typeof x.doshaImbalance !== "object") return false;
    if (!Array.isArray(x.herbalRecommendations)) return false;
    if (!x.dietLifestyle || typeof x.dietLifestyle !== "object") return false;
    return true;
  };

  if (!hasRequiredFields(latest)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-herbal-mint text-herbal-forest dark:bg-sage-800 dark:text-sage-200">
            <Leaf className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            No diagnosis found — run a patient analysis first
          </h1>
          <button
            type="button"
            onClick={() => navigate("/app/patient-analysis")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-herbal-forest px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
          >
            Run patient analysis
          </button>
        </div>
      </div>
    );
  }

  const data = {
    patient: latest.patient,
    prakriti: latest.prakriti,
    diseasePredictions: latest.diseasePredictions,
    doshaImbalance: latest.doshaImbalance,
    herbs: latest.herbalRecommendations,
    dietLifestyle: latest.dietLifestyle,
  };

  const prakritiData = data.prakriti as PrakritiData & {
    vata_pct?: number;
    pitta_pct?: number;
    kapha_pct?: number;
    dominant_dosha?: string;
    top_features?: { feature: string; importance: number }[];
  };

  const dominantDosha =
    prakritiData.dominant ??
    prakritiData.dominantDosha ??
    prakritiData.dominant_dosha ??
    "Unknown";
  const confidenceRaw = prakritiData.confidence ?? null;
  const confidencePctDisplay =
    typeof prakritiData.confidence_pct === "number"
      ? prakritiData.confidence_pct
      : typeof confidenceRaw === "number"
        ? Math.round(confidenceRaw * 1000) / 10
        : null;
  const confidenceForBar =
    typeof confidenceRaw === "number"
      ? confidenceRaw
      : typeof prakritiData.confidence_pct === "number"
        ? prakritiData.confidence_pct / 100
        : null;
  const lowConfidence =
    prakritiData.lowConfidence === true ||
    (prakritiData as { low_confidence?: boolean }).low_confidence === true;
  const interpretation = prakritiData.interpretation ?? null;
  const allClassProbs =
    prakritiData.allClassProbabilities ??
    (prakritiData as { all_class_probabilities?: Record<string, number> }).all_class_probabilities ??
    null;
  const topFeaturesRaw =
    (prakritiData.topFeatures as unknown) ??
    (prakritiData.top_features as unknown) ??
    [];
  const topFeatures = Array.isArray(topFeaturesRaw)
    ? (topFeaturesRaw as { feature: string; importance: number }[])
    : [];

  const vataVal = Number(prakritiData.vata ?? (prakritiData as { vata_pct?: number }).vata_pct ?? 33);
  const pittaVal = Number(prakritiData.pitta ?? (prakritiData as { pitta_pct?: number }).pitta_pct ?? 33);
  const kaphaVal = Number(prakritiData.kapha ?? (prakritiData as { kapha_pct?: number }).kapha_pct ?? 34);

  const prakritiRadarData = useMemo(() => {
    const safe = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 33);
    return [
      { dosha: "Vata", value: safe(vataVal), fullMark: 100 },
      { dosha: "Pitta", value: safe(pittaVal), fullMark: 100 },
      { dosha: "Kapha", value: safe(kaphaVal), fullMark: 100 },
    ];
  }, [vataVal, pittaVal, kaphaVal]);

  const getDoshaBadgeClass = (dosha: string) => {
    const d = String(dosha || "").toLowerCase();
    if (d.includes("-")) {
      if (d.includes("pitta") && d.includes("vata")) {
        return "bg-gradient-to-r from-indigo-500 to-orange-500 text-white";
      }
      if (d.includes("kapha") && d.includes("pitta")) {
        return "bg-gradient-to-r from-teal-500 to-orange-500 text-white";
      }
      if (d.includes("kapha") && d.includes("vata")) {
        return "bg-gradient-to-r from-teal-500 to-indigo-500 text-white";
      }
      return "bg-gradient-to-r from-stone-500 to-stone-700 text-white";
    }
    if (d === "vata") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200";
    if (d === "pitta") return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
    if (d === "kapha") return "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200";
    return "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200";
  };

  const hasApiPrakriti = prakritiData.source === "api";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Prediction results
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            AI-generated clinical insights and recommendations.
          </p>
          {hasApiPrakriti && dominantDosha !== "Unknown" ? (
            <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
              <span className="font-medium text-stone-900 dark:text-stone-100">
                Dominant Prakriti: {dominantDosha}
              </span>
              {confidencePctDisplay != null ? (
                <span className="text-stone-500 dark:text-stone-400">
                  {" "}
                  · Model confidence: {confidencePctDisplay}%
                </span>
              ) : null}
            </p>
          ) : null}
          {data.patient?.name && (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Patient: <span className="font-medium text-stone-800 dark:text-stone-200">{data.patient.name}</span>
              {data.patient.age ? ` · ${data.patient.age} yrs` : ""}{data.patient.gender ? ` · ${data.patient.gender}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/app/patient-report")}
            className="inline-flex items-center gap-2 rounded-lg bg-herbal-forest px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
          >
            <FileText className="h-4 w-4" />
            Generate report
          </button>
        </div>
      </div>

      {/* Prakriti */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        {lowConfidence ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
          >
            Low confidence result — please review manually
          </div>
        ) : null}
        <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Prakriti prediction
        </h2>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="h-64 w-full lg:w-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={prakritiRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dosha" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Score" dataKey="value" stroke="#2d5a3d" fill="#2d5a3d" fillOpacity={0.4} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4">
            {[
              ["vata", vataVal],
              ["pitta", pittaVal],
              ["kapha", kaphaVal],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-600 dark:bg-stone-800"
              >
                <p className="text-xs font-medium uppercase text-stone-500 dark:text-stone-400">{k}</p>
                <p className="text-2xl font-semibold text-herbal-forest dark:text-sage-400">
                  {Number.isFinite(Number(v)) ? Number(v).toFixed(0) : "33"}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prakriti details */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            Prakriti Details
          </h2>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
              getDoshaBadgeClass(dominantDosha)
            )}
          >
            {dominantDosha}
          </span>
        </div>

        {typeof confidenceForBar === "number" ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">
              Confidence
            </p>
            <ConfidenceIndicator value={confidenceForBar} size="md" />
            {lowConfidence ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Model confidence is below the clinical threshold — interpret results with clinical judgment.
              </p>
            ) : null}
          </div>
        ) : null}

        {interpretation ? (
          <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-herbal-forest dark:text-sage-400">
              <Leaf className="h-4 w-4" />
              Interpretation
            </div>
            <blockquote className="italic leading-relaxed">
              {interpretation}
            </blockquote>
          </div>
        ) : null}

        {allClassProbs && Object.keys(allClassProbs).length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Class probabilities (%)
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600 dark:text-stone-400">
              {Object.entries(allClassProbs).map(([cls, pct]) => (
                <li
                  key={cls}
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 dark:border-stone-600 dark:bg-stone-800"
                >
                  <span className="font-medium text-stone-800 dark:text-stone-200">{cls}</span>
                  {": "}
                  {typeof pct === "number" ? pct.toFixed(1) : pct}%
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {topFeatures.length ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Key factors
            </h3>
            <div className="mt-3 space-y-3">
              {(() => {
                const maxImp = Math.max(...topFeatures.map((t) => Number(t.importance) || 0), 1);
                return topFeatures.slice(0, 5).map((t) => {
                  const pct = Math.max(0, Math.min(100, (Number(t.importance) || 0) / maxImp * 100));
                  const label = String(t.feature || "").replace(/_/g, " ");
                  return (
                    <div key={t.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                        <span className="font-medium text-stone-700 dark:text-stone-300">
                          {label}
                        </span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                        <div
                          className="h-full rounded-full bg-herbal-forest/70 dark:bg-sage-500/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : null}
      </section>

      {/* Disease prediction */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Disease prediction
        </h2>
        <ul className="space-y-4">
          {data.diseasePredictions.map(
            (
              d: { condition: string; probability: number; explanation: string },
              i: number
            ) => (
            <li
              key={d.condition}
              className="flex items-start justify-between gap-4 rounded-lg border border-stone-100 p-4 dark:border-stone-700"
            >
              <div className="flex-1">
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {i + 1}. {d.condition}
                </p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{d.explanation}</p>
                <div className="mt-2">
                  <ConfidenceIndicator value={d.probability} size="md" />
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-herbal-forest/15 px-3 py-1 text-sm font-semibold text-herbal-forest dark:bg-sage-500/20 dark:text-sage-300">
                {(d.probability * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Dosha imbalance */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Dosha imbalance analysis
        </h2>
        <div className="space-y-4">
          {Object.entries(
            data.doshaImbalance as Record<string, DoshaEntry>
          ).map(([key, { level, status, label }]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
                <span
                  className={cn(
                    "font-medium",
                    status === "elevated" && "text-amber-600 dark:text-amber-400",
                    status === "normal" && "text-emerald-600 dark:text-emerald-400",
                    status === "low" && "text-blue-600 dark:text-blue-400"
                  )}
                >
                  {status}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                <div
                  className="h-full rounded-full bg-herbal-forest transition-all dark:bg-sage-500"
                  style={{ width: `${level}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Herbal recommendations */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Herbal recommendation panel
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.herbs.map(
            (h: {
              plantName: string;
              therapeuticUses: string;
              preparation: string;
            }) => (
            <div
              key={(h as { id?: string }).id ?? h.plantName}
              className="flex gap-4 rounded-lg border border-stone-200 p-4 dark:border-stone-600"
            >
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-herbal-mint text-2xl dark:bg-sage-800">
                {(h as { imagePlaceholder?: string }).imagePlaceholder ?? "🌿"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900 dark:text-stone-100">{h.plantName}</p>
                <p className="text-xs italic text-stone-500 dark:text-stone-400">
                  {(h as { botanicalName?: string }).botanicalName ?? ""}
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  Dosha: {(h as { doshaEffect?: string }).doshaEffect ?? ""} · {h.therapeuticUses}
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Preparation: {h.preparation}
                </p>
                {(h as { cautions?: string[] }).cautions?.length ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Cautions: {(h as { cautions?: string[] }).cautions?.slice(0, 2).join(", ")}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-herbal-forest hover:underline dark:text-sage-400"
                >
                  View full herb profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Diet & lifestyle */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Diet & lifestyle recommendations
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Recommended foods
            </h3>
            <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">
              {data.dietLifestyle.recommended.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              Foods to avoid
            </h3>
            <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">
              {data.dietLifestyle.avoid.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              Lifestyle advice
            </h3>
            <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">
              {data.dietLifestyle.lifestyle.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              Daily routine
            </h3>
            <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">
              {data.dietLifestyle.dailyRoutine.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
