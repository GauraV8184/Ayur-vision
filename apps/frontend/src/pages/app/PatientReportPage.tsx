import { useMemo, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, MessageSquare, Share2 } from "lucide-react";
import { getJSON, setJSON, STORAGE_KEYS } from "../../utils/storage";
import { getPatientById } from "../../services/patientService";
import { useToast } from "../../components/toast/ToastContext";
import Loader from "../../components/ui/Loader";
import {
  formatReportDate,
  getDominantDosha,
  buildShareText,
} from "../../utils/reportHelpers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPatientUuid(id: string): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

interface DoshaEntry {
  level: number;
  status: string;
  label: string;
}

interface DiseasePrediction {
  condition: string;
  probability: number;
  explanation?: string;
}

interface HerbalRecommendation {
  plantName: string;
  preparation: string;
  therapeuticUses: string;
  botanicalName?: string;
  doshaEffect?: string;
  cautions?: string[];
  imagePlaceholder?: string;
  id?: string;
}

interface DietLifestyle {
  recommended: string[];
  avoid: string[];
  lifestyle: string[];
  dailyRoutine: string[];
}

interface DoctorNotes {
  clinicalObservations: string;
  treatmentPlan: string;
  followUpDate: string;
  prescribedBy: string;
}

interface DiagnosisData {
  id: string;
  createdAt: string;
  patient: {
    id?: string;
    name?: string;
    age?: string | number | null;
    gender?: string | null;
    city?: string | null;
    chiefComplaint?: string | null;
    historyNotes?: string | null;
    lifestyle?: string | null;
    stressLevel?: number | null;
  } | null;
  prakriti: { vata: number; pitta: number; kapha: number };
  doshaImbalance: Record<string, DoshaEntry>;
  diseasePredictions: DiseasePrediction[];
  herbalRecommendations: HerbalRecommendation[];
  dietLifestyle: DietLifestyle | null;
  herbs?: HerbalRecommendation[];
}

interface EnrichedPatient
  extends NonNullable<DiagnosisData["patient"]> {
  city: string | null | undefined;
  chiefComplaint: string | null | undefined;
  historyNotes: string | null | undefined;
  lifestyle: string | null | undefined;
  stressLevel: number | null | undefined;
}

export default function PatientReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const diagnosis = getJSON<DiagnosisData | null>(
    STORAGE_KEYS.latestDiagnosis,
    null
  );
  const data = diagnosis;

  const [remotePatient, setRemotePatient] = useState<
    Record<string, unknown> | null
  >(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState(() => {
    const saved = getJSON<Record<string, string> | null>(
      `ayurvision.doctorNotes.${data?.id}`,
      null
    );
    return {
      clinicalObservations: saved?.clinicalObservations || "",
      treatmentPlan: saved?.treatmentPlan || "",
      followUpDate: saved?.followUpDate || "",
      prescribedBy: saved?.prescribedBy || "",
    };
  });
  const [notesSaved, setNotesSaved] = useState(false);

  // ─── ONLY the useEffect print CSS block needs to change ──────────────────────
// Replace your existing useEffect that injects "ayurvision-print-css" with
// this one. Everything else in PatientReportPage stays exactly the same.

useEffect(() => {
  const style = document.createElement("style");
  style.id = "ayurvision-print-css";

  // IMPORTANT
  // When exporting the PDF in the browser print dialog (e.g. Chrome),
  // disable the "Headers and Footers" option so the browser does not
  // add its own URL/date/footer text to the clinical report.

  style.innerHTML = `
@page {
  size: A4 portrait;
  margin: 12mm;
}

@media print {

  /* ── Hide everything first ── */
  body * {
    visibility: hidden !important;
  }

  /* ── Show only the report root ── */
  #ayurvision-report-root,
  #ayurvision-report-root * {
    visibility: visible !important;
  }

  #ayurvision-report-root {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 210mm;
    margin: 0 auto !important;
    font-size: 11.5px;
    line-height: 1.35;
  }

  /* ── THEME FIX: force every element to white bg / black text ── */
  #ayurvision-report-root,
  #ayurvision-report-root * {
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #111827 !important;
    border-color: #d1d5db !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ── Restore specific coloured elements that must keep their colour ── */

  /* Table header rows */
  #ayurvision-report-root table thead tr,
  #ayurvision-report-root table thead tr th {
    background-color: #f3f4f6 !important;
    color: #111827 !important;
  }

  /* Zebra / info rows background — keep white */
  #ayurvision-report-root table td {
    background-color: #ffffff !important;
    color: #111827 !important;
  }

  /* Bold / strong stays black */
  #ayurvision-report-root b,
  #ayurvision-report-root strong {
    color: #111827 !important;
  }

  /* Section h2 headings — preserve the green colour */
  #ayurvision-report-root h2 {
    color: #1c1917 !important;
    background: transparent !important;
  }

  /* ── Hide UI controls ── */
  .no-print,
  .no-print * {
    display: none !important;
    visibility: hidden !important;
  }

  #ayurvision-report-root .no-print {
    display: none !important;
  }

  /* ── Layout resets ── */
  html, body {
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #111827 !important;
  }

  body {
    background: #ffffff !important;
  }

  .min-h-screen,
  .h-screen {
    min-height: auto !important;
    height: auto !important;
  }

  /* Flatten Tailwind card/shadow utilities */
  .bg-white,
  .bg-stone-50,
  .bg-stone-100,
  .bg-stone-50\/50,
  .dark\\:bg-stone-800,
  .dark\\:bg-stone-900,
  .dark\\:bg-stone-900\\/60,
  .dark\\:bg-stone-900\\/90,
  .dark\\:bg-sage-800 {
    background-color: #ffffff !important;
  }

  .shadow,
  .shadow-sm,
  .shadow-md,
  .shadow-lg,
  .shadow-card {
    box-shadow: none !important;
  }

  .rounded,
  .rounded-lg,
  .rounded-xl,
  .rounded-full {
    border-radius: 0 !important;
  }

  /* Remove container padding */
  .p-4, .p-5, .p-6, .p-8, .px-4, .py-2, .px-3 {
    padding: 0 !important;
  }

  /* Kill dark text colours from Tailwind */
  .text-stone-400,
  .text-stone-500,
  .text-stone-600,
  .dark\\:text-stone-200,
  .dark\\:text-stone-300,
  .dark\\:text-stone-400,
  .dark\\:text-stone-500,
  .dark\\:text-stone-100 {
    color: #374151 !important;
  }

  /* Amber warning text */
  .text-amber-700,
  .dark\\:text-amber-200,
  .dark\\:text-amber-300 {
    color: #92400e !important;
    background: transparent !important;
  }

  /* Status colours */
  .text-emerald-700,
  .dark\\:text-emerald-300 {
    color: #065f46 !important;
  }

  .text-blue-700,
  .dark\\:text-blue-300 {
    color: #1d4ed8 !important;
  }

  /* Herb icon background — keep the mint green */
  .bg-herbal-mint,
  .dark\\:bg-sage-800 {
    background-color: #d1fae5 !important;
  }

  /* Progress bars — keep their colours */
  .bg-blue-400  { background-color: #60a5fa !important; }
  .bg-amber-400 { background-color: #fbbf24 !important; }
  .bg-emerald-500 { background-color: #10b981 !important; }
  .bg-herbal-forest,
  .dark\\:bg-sage-500 {
    background-color: #2d6a4f !important;
  }

  /* The progress bar track */
  .bg-stone-200,
  .dark\\:bg-stone-800 {
    background-color: #e5e7eb !important;
  }

  /* Diet column top-border colours — keep them */
  .border-emerald-500 { border-color: #10b981 !important; }
  .border-red-500     { border-color: #ef4444 !important; }
  .border-blue-500    { border-color: #3b82f6 !important; }
  .border-purple-500  { border-color: #8b5cf6 !important; }

  /* Diet column title text colours */
  .text-emerald-700 { color: #065f46 !important; }
  .text-red-700     { color: #b91c1c !important; }
  .text-blue-700    { color: #1d4ed8 !important; }
  .text-purple-700  { color: #6d28d9 !important; }

  /* ── Print bar fix: progress bars print correctly ── */
  .print-bar {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ── Section / table structure ── */
  table {
    border-collapse: collapse;
    width: 100%;
  }

  th, td {
    border: 1px solid #d1d5db;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }

  h2 {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .section {
    margin-bottom: 8px;
    break-inside: avoid;
  }

  .print-footer {
    margin-top: 6pt !important;
    break-inside: avoid !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  #ayurvision-report-root > div {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  .space-y-6 > *:last-child {
    margin-bottom: 0 !important;
  }

  .section:last-child,
  .print-footer:last-child {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
}

/* ── Screen: keep body white so report looks clean on screen too ── */
body {
  background: white !important;
}

#ayurvision-report-root > div {
  height: auto !important;
  min-height: 0 !important;
}

.section:last-child {
  margin-bottom: 0 !important;
}
  `;

  document.head.appendChild(style);

  return () => {
    const existing = document.getElementById("ayurvision-print-css");
    if (existing) existing.remove();
  };
}, []);

  useEffect(() => {
    const pid = diagnosis?.patient?.id;
    if (!pid || !isPatientUuid(pid)) {
      setRemotePatient(null);
      setIsLoadingPatient(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) setIsLoadingPatient(true);
        const p = await getPatientById(pid);
        if (!cancelled) setRemotePatient(p);
      } catch (e: unknown) {
        if (!cancelled) {
          setRemotePatient(null);
          showToast(
            e instanceof Error ? e.message : "error",
            "error"
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPatient(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [diagnosis?.patient?.id, showToast]);

  const enrichedPatient = useMemo(() => {
    if (!diagnosis?.patient) return null;
    const fromDb = remotePatient as Record<string, unknown> | null;
    return {
      ...diagnosis.patient,
      city:
        diagnosis.patient.city ??
        (fromDb?.city as string | null | undefined) ??
        null,
      chiefComplaint:
        diagnosis.patient.chiefComplaint ??
        (fromDb?.chiefComplaint as string | null | undefined) ??
        null,
      historyNotes:
        diagnosis.patient.historyNotes ??
        (fromDb?.historyNotes as string | null | undefined) ??
        null,
      lifestyle:
        diagnosis.patient.lifestyle ??
        (fromDb?.lifestyle as string | null | undefined) ??
        null,
      stressLevel:
        diagnosis.patient.stressLevel ??
        (fromDb?.stressLevel as number | null | undefined) ??
        null,
    };
  }, [diagnosis, remotePatient]);

  const dominantDosha = useMemo(
    () => (diagnosis?.prakriti ? getDominantDosha(diagnosis.prakriti) : null),
    [diagnosis],
  );

  const handleSaveNotes = useCallback(() => {
    if (!data?.id) return;
    setJSON(`ayurvision.doctorNotes.${data.id}`, doctorNotes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }, [data, doctorNotes]);

  const handleDownloadPDF = () => {
    const patientName = data?.patient?.name?.replace(/\s+/g, "_") || "Patient";
    const dateStr = data?.createdAt
      ? formatReportDate(data.createdAt)
      : "Report";
    document.title = `AyurVision_Report_${patientName}_${dateStr}`;

    setIsPrinting(true);

    // Wait one frame for React to re-render textareas → plain text
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        // Restore after print dialog closes
        setTimeout(() => {
          setIsPrinting(false);
          document.title = "AyurVision";
        }, 1000);
      }, 300);
    });
  };

  const handleShare = useCallback(async () => {
    try {
      const text = buildShareText(
        diagnosis as Parameters<typeof buildShareText>[0]
      );
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        // Optional: non-intrusive feedback; for now, rely on browser behavior
      } else {
        // Fallback: prompt so user can copy manually
        window.prompt("Copy report summary:", text);
      }
    } catch {
      // Silent failure to avoid breaking UX
    }
  }, [diagnosis]);

  if (!diagnosis) {
    return (
      <div id="ayurvision-report-root">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-herbal-forest dark:text-sage-300">
            Patient report
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
            No diagnosis data found
          </h1>
          <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
            To generate a patient report, please run a full Patient Analysis
            workflow first.
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/patient-analysis")}
            className="no-print mt-6 inline-flex items-center gap-2 rounded-lg bg-herbal-forest px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
          >
            <StethoscopeIcon className="h-4 w-4" />
            Go to Patient Analysis
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingPatient) {
    return (
      <div id="ayurvision-report-root">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center text-center">
          <Loader />
        </div>
      </div>
    );
  }

  if (diagnosis?.patient?.id && isPatientUuid(diagnosis.patient.id) && !remotePatient) {
    return (
      <div id="ayurvision-report-root">
        <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Patient record not found
          </h1>
          <button
            type="button"
            onClick={() => navigate("/app/patient-analysis")}
            className="no-print mt-6 inline-flex items-center gap-2 rounded-lg bg-herbal-forest px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
          >
            Go to Patient Analysis
          </button>
        </div>
      </div>
    );
  }

  const {
    prakriti,
    doshaImbalance,
    diseasePredictions,
    herbalRecommendations,
    dietLifestyle,
  } = diagnosis;

  const knowledgeAssistantPatientId =
    diagnosis.patient?.id && isPatientUuid(diagnosis.patient.id)
      ? diagnosis.patient.id
      : null;

  return (
    <div id="ayurvision-report-root">
      <div className="mx-auto max-w-5xl space-y-6 print:bg-white print:text-black print:space-y-0 print:p-0 print:m-0">
        {/* Action bar (hidden in print) */}
        <div className="no-print sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/80 px-1 py-3 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/80">
          <button
            type="button"
            onClick={() => navigate("/app/prediction-results")}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </button>
          <div className="flex items-center gap-2">
            {knowledgeAssistantPatientId ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/app/knowledge-assistant?patient=${encodeURIComponent(knowledgeAssistantPatientId)}`
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
              >
                <MessageSquare className="h-4 w-4" />
                Open in Knowledge Assistant
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg bg-herbal-forest px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <Share2 className="h-4 w-4" />
              Share Report
            </button>
          </div>
          <p className="no-print mt-1 text-[11px] text-stone-400 dark:text-stone-500">
            Tip: In the print dialog, uncheck &quot;Headers and footers&quot;
            for a clean export.
          </p>
        </div>

        {/* Report content */}
        {isPrinting ? (
          <PrintClinicalReport
            data={diagnosis}
            enrichedPatient={enrichedPatient}
            dominantDosha={dominantDosha}
            prakriti={prakriti}
            doshaImbalance={doshaImbalance}
            diseasePredictions={diseasePredictions}
            herbalRecommendations={herbalRecommendations}
            dietLifestyle={dietLifestyle}
            doctorNotes={doctorNotes}
          />
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900/90">
            {/* Clinical header / patient strip */}
            <header className="border-b border-stone-200 pb-3 text-xs dark:border-stone-700">
              <h1 className="text-xs font-semibold tracking-wide text-stone-900 dark:text-stone-50">
                AYURVISION AI – CLINICAL REPORT
              </h1>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-3 print-patient-strip">
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Patient Name:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {enrichedPatient?.name || data?.patient?.name || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Age:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {enrichedPatient?.age
                      ? `${enrichedPatient.age} yrs`
                      : data?.patient?.age
                        ? `${data.patient.age} yrs`
                        : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Gender:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {enrichedPatient?.gender || data?.patient?.gender || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Report Date:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {formatReportDate(diagnosis.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Patient ID:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {enrichedPatient?.id || data?.patient?.id || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Prakriti Type:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {prakriti
                      ? `Vata ${prakriti.vata ?? 0}% / Pitta ${prakriti.pitta ?? 0}% / Kapha ${prakriti.kapha ?? 0
                      }%`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Dominant Dosha:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {dominantDosha || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Report ID:{" "}
                  </span>
                  <span className="text-stone-900 dark:text-stone-50">
                    {diagnosis.id}
                  </span>
                </div>
              </div>
            </header>

            <main className="mt-4 space-y-4 text-xs leading-relaxed text-stone-800 dark:text-stone-100">
              {/* Patient Summary */}
              <section className="clinical-section print-section">
                <h2 className="font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                  Patient Summary
                </h2>
                {enrichedPatient ? (
                  <div className="mt-1 grid gap-1 text-xs md:grid-cols-3">
                    <div>
                      <span className="font-semibold text-stone-600 dark:text-stone-300">
                        Chief Complaint:{" "}
                      </span>
                      <span>
                        {enrichedPatient.chiefComplaint || "Not documented"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600 dark:text-stone-300">
                        Lifestyle:{" "}
                      </span>
                      <span>
                        {enrichedPatient.lifestyle || "Not documented"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600 dark:text-stone-300">
                        Stress Level:{" "}
                      </span>
                      <span>
                        {enrichedPatient.stressLevel != null
                          ? `${enrichedPatient.stressLevel}/10`
                          : "Not recorded"}
                      </span>
                    </div>
                    <div className="md:col-span-3">
                      <span className="font-semibold text-stone-600 dark:text-stone-300">
                        History Notes:{" "}
                      </span>
                      <span>
                        {enrichedPatient.historyNotes ||
                          "No detailed history notes captured for this visit."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Patient demographic details were not captured with this
                    diagnosis.
                  </p>
                )}
              </section>

              {/* Clinical body grid */}
              <div className="clinical-grid">
                {/* Left column: prakriti, dosha, disease predictions */}
                <div className="space-y-4">
                  {/* Prakriti Analysis */}
                  <section className="clinical-section print-section">
                    <h2 className="font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                      Prakriti Analysis
                    </h2>
                    {prakriti ? (
                      <div className="space-y-4">
                        <p className="text-sm text-stone-600 dark:text-stone-300">
                          Overall constitution proportions based on
                          AyurVision&apos;s AI assessment.
                        </p>
                        <div className="space-y-3">
                          {["Vata", "Pitta", "Kapha"].map((doshaKey) => {
                            const keyLower = doshaKey.toLowerCase();
                            const value = prakriti[
                              keyLower as keyof typeof prakriti
                            ] ?? 0;
                            const isDominant = dominantDosha === doshaKey;
                            const colorClass =
                              doshaKey === "Vata"
                                ? "bg-blue-400"
                                : doshaKey === "Pitta"
                                  ? "bg-amber-400"
                                  : "bg-emerald-500";
                            return (
                              <div key={doshaKey}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={
                                        "font-semibold uppercase tracking-wide " +
                                        (isDominant
                                          ? "text-herbal-forest dark:text-sage-300"
                                          : "text-stone-600 dark:text-stone-300")
                                      }
                                    >
                                      {doshaKey}
                                    </span>
                                    {isDominant && (
                                      <span className="inline-flex items-center rounded-full bg-herbal-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-herbal-forest dark:bg-sage-500/10 dark:text-sage-300">
                                        ★ Dominant
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-stone-700 dark:text-stone-200">
                                    {value}%
                                  </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                                  <div
                                    className={`print-bar h-full rounded-full ${colorClass}`}
                                    style={{ width: `${value}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600 dark:text-stone-300">
                        Prakriti analysis is not available for this record.
                      </p>
                    )}
                  </section>

                  {/* Dosha Imbalance */}
                  <section className="clinical-section print-section">
                    <h2 className="font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                      Dosha Imbalance
                    </h2>
                    {doshaImbalance ? (
                      <div className="space-y-3">
                        {Object.entries(
                          doshaImbalance as Record<string, DoshaEntry>
                        ).map(
                          ([key, { level, status, label }]) => {
                            let statusColor =
                              "text-stone-700 dark:text-stone-300";
                            if (status === "elevated")
                              statusColor =
                                "text-amber-700 dark:text-amber-300";
                            if (status === "normal")
                              statusColor =
                                "text-emerald-700 dark:text-emerald-300";
                            if (status === "low")
                              statusColor = "text-blue-700 dark:text-blue-300";
                            return (
                              <div key={key}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-stone-800 dark:text-stone-100">
                                    {label}
                                  </span>
                                  <span
                                    className={`font-medium capitalize ${statusColor}`}
                                  >
                                    {status}
                                  </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                                  <div
                                    className="print-bar h-full rounded-full bg-herbal-forest dark:bg-sage-500"
                                    style={{ width: `${level}%` }}
                                  />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600 dark:text-stone-300">
                        Dosha imbalance analysis was not included with this
                        report.
                      </p>
                    )}
                  </section>

                  {/* Disease Predictions */}
                  <section className="clinical-section print-section">
                    <h2 className="font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                      Predicted Conditions
                    </h2>
                    {diseasePredictions?.length ? (
                      <ol className="mt-1 space-y-1 text-xs">
                        {diseasePredictions.map(
                          (
                            d: { condition: string; probability: number },
                            index: number
                          ) => {
                          const pct = (d.probability || 0) * 100;
                          const firstSentence =
                            ((d as { explanation?: string }).explanation ||
                              "")
                              .split(".")[0] || "";
                          return (
                            <li key={d.condition}>
                              <span className="font-semibold">
                                {index + 1}. {d.condition}
                              </span>
                              {" – "}
                              <span className="font-semibold">
                                {pct.toFixed(0)}%
                              </span>
                              {firstSentence && (
                                <>
                                  {" – "}
                                  <span>{firstSentence.trim()}.</span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-xs text-stone-600 dark:text-stone-300">
                        No specific disease predictions were generated for this
                        assessment.
                      </p>
                    )}
                  </section>
                </div>

                {/* Right column: physician notes, herbs, diet */}
                <div className="space-y-4">
                  {/* Physician notes */}
                  <section className="clinical-section print-section">
                    <h2 className="font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
                      Physician Observations
                    </h2>
                    <div className="mb-2 text-[11px] text-amber-800 dark:text-amber-200">
                      These notes are saved locally in your browser and included
                      when printing.
                    </div>
                    <div className="print-notes-grid grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Prescribed By
                        </label>
                        {isPrinting ? (
                          <p className="min-h-[2.5rem] rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                            {doctorNotes.prescribedBy || "—"}
                          </p>
                        ) : (
                          <input
                            type="text"
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 focus:border-herbal-forest focus:outline-none focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            placeholder="Dr. Name, Qualification"
                            value={doctorNotes.prescribedBy}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                prescribedBy: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Follow-up Date
                        </label>
                        {isPrinting ? (
                          <p className="min-h-[2.5rem] rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                            {doctorNotes.followUpDate || "—"}
                          </p>
                        ) : (
                          <input
                            type="date"
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 focus:border-herbal-forest focus:outline-none focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            value={doctorNotes.followUpDate}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                followUpDate: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Clinical Observations
                        </label>
                        {isPrinting ? (
                          <p className="min-h-[4.5rem] rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                            {doctorNotes.clinicalObservations || "—"}
                          </p>
                        ) : (
                          <textarea
                            rows={3}
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 focus:border-herbal-forest focus:outline-none focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            placeholder="Pulse diagnosis findings, tongue examination, general observations..."
                            value={doctorNotes.clinicalObservations}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                clinicalObservations: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Treatment Plan
                        </label>
                        {isPrinting ? (
                          <p className="min-h-[5.5rem] rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                            {doctorNotes.treatmentPlan || "—"}
                          </p>
                        ) : (
                          <textarea
                            rows={4}
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 focus:border-herbal-forest focus:outline-none focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            placeholder="Panchakarma procedures, formulations prescribed, duration..."
                            value={doctorNotes.treatmentPlan}
                            onChange={(e) =>
                              setDoctorNotes((prev) => ({
                                ...prev,
                                treatmentPlan: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    </div>
                    {!isPrinting && (
                      <div className="no-print mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          className="rounded-lg bg-herbal-forest px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-herbal-forest/90 dark:bg-sage-500 dark:hover:bg-sage-400"
                        >
                          Save Notes
                        </button>
                        {notesSaved && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ Saved!
                          </span>
                        )}
                      </div>
                    )}
                  </section>

                  {/* 7. Herbal Recommendations */}
                  <section className="print-section rounded-xl bg-stone-50/50 p-4 dark:bg-stone-900/60">
                    <h2 className="mb-3 border-l-4 border-herbal-forest pl-4 text-base font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
                      6. Herbal Recommendations
                    </h2>
                    {herbalRecommendations?.length ? (
                      <div className="print-herbs-grid grid gap-4 md:grid-cols-2">
                        {herbalRecommendations.map(
                          (
                            h: {
                              plantName: string;
                              preparation: string;
                              therapeuticUses: string;
                            }
                          ) => (
                          <article
                            key={(h as { id?: string }).id ?? h.plantName}
                            className="print-herb-card flex gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900"
                          >
                            <div className="print-herb-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-herbal-mint text-xl dark:bg-sage-800">
                              {(h as { imagePlaceholder?: string }).imagePlaceholder ||
                                "🌿"}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div>
                                <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                                  {h.plantName}
                                </h3>
                                <p className="text-xs italic text-stone-500 dark:text-stone-400">
                                  {(h as { botanicalName?: string }).botanicalName ??
                                    ""}
                                </p>
                              </div>
                              <div className="grid gap-3 text-xs md:grid-cols-2">
                                <div>
                                  <p className="font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                    Dosha Effect
                                  </p>
                                  <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-200">
                                    {(h as { doshaEffect?: string }).doshaEffect ||
                                      "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                    Preparation
                                  </p>
                                  <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-200">
                                    {h.preparation}
                                  </p>
                                </div>
                              </div>
                              {(h as { cautions?: string[] }).cautions?.length ? (
                                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                  ⚠️ Cautions: {(h as { cautions?: string[] }).cautions?.join(
                                    "; "
                                  )}
                                </p>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        No herbal formulations were recommended for this case.
                      </p>
                    )}
                  </section>

                  {/* 8. Diet & Lifestyle Guidance */}
                  <section className="print-section rounded-xl bg-white p-4 dark:bg-stone-900/60">
                    <h2 className="mb-3 border-l-4 border-herbal-forest pl-4 text-base font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
                      7. Diet &amp; Lifestyle Guidance
                    </h2>
                    {dietLifestyle ? (
                      <div className="print-diet-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DietColumn
                          title="Recommended Foods"
                          color="emerald"
                          items={dietLifestyle.recommended}
                        />
                        <DietColumn
                          title="Foods to Avoid"
                          color="red"
                          items={dietLifestyle.avoid}
                        />
                        <DietColumn
                          title="Lifestyle Practices"
                          color="blue"
                          items={dietLifestyle.lifestyle}
                        />
                        <DietColumn
                          title="Daily Routine"
                          color="purple"
                          items={dietLifestyle.dailyRoutine}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Diet and lifestyle guidance was not generated for this
                        assessment.
                      </p>
                    )}
                  </section>
                </div>
              </div>

              {/* 9. Report Footer (screen layout) */}
              <footer className="mt-4 flex flex-col justify-between border-t border-stone-200 pt-3 text-xs text-stone-400 dark:border-stone-700 dark:text-stone-500 md:flex-row md:items-center">
                <p className="italic">
                  This report is generated by AI for clinical decision support
                  only. It does not replace professional Ayurvedic medical
                  advice. Always consult a qualified practitioner before acting
                  on these recommendations.
                </p>
                <p className="mt-2 text-right md:mt-0">
                  Prepared by AyurVision AI · ayurvision.health
                </p>
              </footer>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

interface PrintClinicalReportProps {
  data: DiagnosisData;
  enrichedPatient: EnrichedPatient | null;
  dominantDosha: string | null;
  prakriti: DiagnosisData["prakriti"];
  doshaImbalance: Record<string, DoshaEntry>;
  diseasePredictions: DiseasePrediction[];
  herbalRecommendations: HerbalRecommendation[];
  dietLifestyle: DietLifestyle | null;
  doctorNotes: DoctorNotes;
}

function PrintClinicalReport({
  data,
  enrichedPatient,
  dominantDosha,
  prakriti,
  doshaImbalance,
  diseasePredictions,
  herbalRecommendations,
  dietLifestyle,
  doctorNotes,
}: PrintClinicalReportProps) {
  const patientName = enrichedPatient?.name || data?.patient?.name || "—";
  const age = enrichedPatient?.age ?? data?.patient?.age;
  const gender = enrichedPatient?.gender || data?.patient?.gender || "—";
  const patientId = enrichedPatient?.id || data?.patient?.id || "—";
  const reportDate = data?.createdAt ? formatReportDate(data.createdAt) : "—";

  const recommended = dietLifestyle?.recommended || [];
  const avoid = dietLifestyle?.avoid || [];
  const maxDietRows = Math.max(recommended.length, avoid.length);

  const obsLines = (doctorNotes?.clinicalObservations || "")
    .split(/\r?\n|;|•/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {/* Header */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">
          AYURVISION AI – CLINICAL REPORT
        </h2>
        <table>
          <tbody>
            <tr>
              <td>
                <b>Patient Name</b>
                <br />
                {patientName}
              </td>
              <td>
                <b>Age</b>
                <br />
                {age != null ? `${age}` : "—"}
              </td>
              <td>
                <b>Gender</b>
                <br />
                {gender}
              </td>
            </tr>
            <tr>
              <td>
                <b>Patient ID</b>
                <br />
                {patientId}
              </td>
              <td>
                <b>Report Date</b>
                <br />
                {reportDate}
              </td>
              <td>
                <b>Report ID</b>
                <br />
                {data?.id || "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <b>Prakriti</b>
                <br />
                {prakriti
                  ? `Vata ${prakriti.vata ?? 0}% | Pitta ${prakriti.pitta ?? 0}% | Kapha ${prakriti.kapha ?? 0}%`
                  : "—"}
              </td>
              <td>
                <b>Dominant Dosha</b>
                <br />
                {dominantDosha || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Patient summary */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">PATIENT SUMMARY</h2>
        <table>
          <tbody>
            <tr>
              <td>
                <b>City</b>
                <br />
                {enrichedPatient?.city || data?.patient?.city || "—"}
              </td>
              <td>
                <b>Chief Complaint</b>
                <br />
                {enrichedPatient?.chiefComplaint ||
                  data?.patient?.chiefComplaint ||
                  "—"}
              </td>
            </tr>
            <tr>
              <td>
                <b>Lifestyle</b>
                <br />
                {enrichedPatient?.lifestyle || data?.patient?.lifestyle || "—"}
              </td>
              <td>
                <b>Stress Level</b>
                <br />
                {(enrichedPatient?.stressLevel ?? data?.patient?.stressLevel) !=
                  null
                  ? `${enrichedPatient?.stressLevel ?? data?.patient?.stressLevel}/10`
                  : "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <b>History Notes</b>
                <br />
                {enrichedPatient?.historyNotes ||
                  data?.patient?.historyNotes ||
                  "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dosha profile */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">DOSHA PROFILE</h2>
        <table>
          <thead>
            <tr>
              <th>Dosha</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vata</td>
              <td>{prakriti?.vata ?? "—"}%</td>
            </tr>
            <tr>
              <td>Pitta</td>
              <td>{prakriti?.pitta ?? "—"}%</td>
            </tr>
            <tr>
              <td>Kapha</td>
              <td>{prakriti?.kapha ?? "—"}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dosha imbalance (preserve existing data) */}
      {doshaImbalance ? (
        <div className="section">
          <h2 className="m-0 p-0 font-semibold">DOSHA IMBALANCE</h2>
          <table>
            <thead>
              <tr>
                <th>Dosha</th>
                <th>Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                doshaImbalance as Record<string, DoshaEntry>
              ).map(([k, v]) => (
                <tr key={k}>
                  <td>{v.label || k}</td>
                  <td>{v.level != null ? `${v.level}%` : "—"}</td>
                  <td>{v.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Predictions */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">PREDICTED CONDITIONS</h2>
        {diseasePredictions?.length ? (
          <ol className="m-0 pl-5">
            {diseasePredictions.map(
              (
                d: { condition: string; probability: number },
                i: number
              ) => {
              const pct = ((d.probability || 0) * 100).toFixed(0);
              const oneSentence =
                ((d as { explanation?: string }).explanation || "")
                  .split(".")[0]
                  ?.trim();
              return (
                <li key={`${d.condition}-${i}`}>
                  <b>{d.condition}</b> – {pct}%
                  {oneSentence ? ` — ${oneSentence}.` : ""}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="m-0">No predicted conditions available.</p>
        )}
      </div>

      {/* Physician notes */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">PHYSICIAN OBSERVATIONS</h2>
        <table>
          <tbody>
            <tr>
              <td>
                <b>Prescribed By</b>
                <br />
                {doctorNotes?.prescribedBy || "—"}
              </td>
              <td>
                <b>Follow-up Date</b>
                <br />
                {doctorNotes?.followUpDate || "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <b>Symptoms Observed</b>
                <br />
                {obsLines.length ? (
                  <ul className="m-0 pl-5">
                    {obsLines.slice(0, 8).map((x: string, idx: number) => (
                      <li key={`${x}-${idx}`}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <b>Treatment Direction</b>
                <br />
                {doctorNotes?.treatmentPlan || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Herbs table */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">HERBAL RECOMMENDATIONS</h2>
        {herbalRecommendations?.length ? (
          <table>
            <thead>
              <tr>
                <th>Herb</th>
                <th>Botanical Name</th>
                <th>Dosha Effect</th>
                <th>Preparation</th>
                <th>Caution</th>
              </tr>
            </thead>
            <tbody>
              {herbalRecommendations.map(
                (
                  h: {
                    plantName: string;
                    preparation: string;
                    therapeuticUses: string;
                  }
                ) => (
                <tr key={(h as { id?: string }).id ?? h.plantName}>
                  <td>{h.plantName}</td>
                  <td>
                    {(h as { botanicalName?: string }).botanicalName ?? "—"}
                  </td>
                  <td>
                    {(h as { doshaEffect?: string }).doshaEffect || "—"}
                  </td>
                  <td>{h.preparation || "—"}</td>
                  <td>
                    {(h as { cautions?: string[] }).cautions?.length
                      ? (h as { cautions?: string[] }).cautions?.join("; ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="m-0">No herbal recommendations available.</p>
        )}
      </div>

      {/* Diet table */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">DIETARY GUIDELINES</h2>
        <table>
          <thead>
            <tr>
              <th>Recommended</th>
              <th>Avoid</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(3, maxDietRows) }).map((_, idx) => (
              <tr key={idx}>
                <td>{recommended[idx] || ""}</td>
                <td>{avoid[idx] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lifestyle advice (preserve data) */}
      <div className="section">
        <h2 className="m-0 p-0 font-semibold">LIFESTYLE AND ROUTINE</h2>
        <table>
          <thead>
            <tr>
              <th>Lifestyle Advice</th>
              <th>Daily Routine</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({
              length: Math.max(
                dietLifestyle?.lifestyle?.length || 0,
                dietLifestyle?.dailyRoutine?.length || 0,
                3,
              ),
            }).map((_, idx) => (
              <tr key={idx}>
                <td>{dietLifestyle?.lifestyle?.[idx] || ""}</td>
                <td>{dietLifestyle?.dailyRoutine?.[idx] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="section print-footer"
        style={{ marginBottom: 0, paddingBottom: 0 }}
      >
        <p className="m-0">
          <b>Prepared by:</b> AyurVision AI Clinical System
        </p>
        <p className="m-0">
          This report supports clinical decision making only.
        </p>
        <p className="m-0">
          Final diagnosis must be confirmed by a qualified Ayurvedic
          practitioner.
        </p>
        <p className="m-0" style={{ marginTop: 8 }}>
          Doctor Signature: ______________________
        </p>
      </div>
    </div>
  );
}

function DietColumn({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: string[];
}) {
  const colorClasses = {
    emerald: {
      border: "border-emerald-500",
      title: "text-emerald-700 dark:text-emerald-400",
    },
    red: {
      border: "border-red-500",
      title: "text-red-700 dark:text-red-400",
    },
    blue: {
      border: "border-blue-500",
      title: "text-blue-700 dark:text-blue-400",
    },
    purple: {
      border: "border-purple-500",
      title: "text-purple-700 dark:text-purple-400",
    },
  }[color] || {
    border: "border-stone-300",
    title: "text-stone-700 dark:text-stone-300",
  };

  return (
    <div
      className={`rounded-lg border-t-4 ${colorClasses.border} bg-stone-50 p-3 dark:bg-stone-900/70`}
    >
      <h3
        className={`mb-2 text-xs font-semibold uppercase tracking-wide ${colorClasses.title}`}
      >
        {title}
      </h3>
      {items?.length ? (
        <ul className="space-y-0.5 text-sm text-stone-700 dark:text-stone-200">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-1.5">
              <span className="mt-[2px] text-xs">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          No items specified.
        </p>
      )}
    </div>
  );
}

function StethoscopeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M6 3a1 1 0 0 0-1 1v4a5 5 0 0 0 10 0V4a1 1 0 1 0-2 0v4a3 3 0 0 1-6 0V4a1 1 0 0 0-1-1zm11 9a3 3 0 0 0-1 5.83V19a4 4 0 0 1-4 4h-1a1 1 0 1 1 0-2h1a2 2 0 0 0 2-2v-1.17A3.001 3.001 0 0 0 20 15a3 3 0 0 0-3-3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
        fill="currentColor"
      />
    </svg>
  );
}