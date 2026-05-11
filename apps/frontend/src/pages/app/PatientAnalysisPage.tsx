import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Sparkles, UserPlus } from "lucide-react";
import { cn } from "../../utils/cn";
import { symptomCatalog } from "../../__mocks__/mockSymptoms";
import { runDiagnosis } from "../../services/mockAiService";
import { saveDiagnosis } from "../../services/patientService";
import { useToast } from "../../components/toast/ToastContext";
import { usePatients } from "../../hooks/usePatients";
import axios from "axios";
import { setJSON, STORAGE_KEYS } from "../../utils/storage";
import { predictPrakriti, type PrakritiPredictionResponse } from "../../services/api";
import AILoadingState from "../../components/ui/AILoadingState";

const PRAKRITI_QUESTIONS = [
  {
    key: "Q1_Body_Size",
    label: "Body Size",
    options: ["Slim", "Medium", "Large/Heavy"],
  },
  {
    key: "Q2_Body_Weight",
    label: "Body Weight",
    options: ["Low, difficult to gain", "Moderate", "Heavy, difficult to lose"],
  },
  {
    key: "Q3_Height",
    label: "Height",
    options: ["Tall", "Medium", "Short"],
  },
  {
    key: "Q4_Bone_Structure",
    label: "Bone Structure",
    options: ["Light, small joints", "Medium", "Broad, large"],
  },
  {
    key: "Q5_Complexion",
    label: "Complexion",
    options: ["Dark/dull", "Fair/reddish", "Pale, white, glowing"],
  },
  {
    key: "Q6_General_Features",
    label: "General Features",
    options: ["Thin/prominent features", "Sharp/defined features", "Soft/rounded features"],
  },
  {
    key: "Q7_Skin_Texture",
    label: "Skin Texture",
    options: ["Dry/rough", "Sensitive/oily", "Moist/smooth"],
  },
  {
    key: "Q8_Hair_Color",
    label: "Hair Color",
    options: ["Dark/black", "Brown/reddish", "Light/blonde"],
  },
  {
    key: "Q9_Overall_Appearance",
    label: "Overall Appearance",
    options: ["Thin/angular", "Medium/proportional", "Heavy/rounded"],
  },
  {
    key: "Q10_Eyes_Shape",
    label: "Eyes Shape",
    options: ["Small/narrow", "Medium/sharp", "Large/round"],
  },
  {
    key: "Q11_Eyelashes",
    label: "Eyelashes",
    options: ["Thin/dry", "Moderate", "Thick/long"],
  },
  {
    key: "Q12_Blinking",
    label: "Blinking Frequency",
    options: ["Frequent", "Moderate", "Rare"],
  },
  {
    key: "Q13_Cheeks",
    label: "Cheeks",
    options: ["Sunken", "Moderate", "Round/full"],
  },
  {
    key: "Q14_Nose",
    label: "Nose",
    options: ["Thin/small", "Medium", "Large/broad"],
  },
  {
    key: "Q15_Teeth_Lips",
    label: "Teeth & Lips",
    options: ["Thin/irregular", "Medium", "Large/full"],
  },
  {
    key: "Q16_Nails",
    label: "Nails",
    options: ["Thin/brittle", "Medium", "Thick/strong"],
  },
  {
    key: "Q17_Appetite",
    label: "Appetite",
    options: ["Variable/irregular", "Sharp/excessive", "Slow/steady"],
  },
  {
    key: "Q18_Liking_of_Taste",
    label: "Preferred Taste",
    options: ["Sour/salty", "Sweet/bitter", "Sweet/salty"],
  },
  {
    key: "Q19_Sleep",
    label: "Sleep Quality",
    options: ["Light/interrupted", "Moderate", "Deep/heavy"],
  },
  {
    key: "Q20_Energy_Stamina",
    label: "Energy & Stamina",
    options: ["Bursts/variable", "Moderate/intense", "Sustained/slow"],
  },
  {
    key: "Q21_Sweating",
    label: "Sweating",
    options: ["Minimal", "Profuse", "Moderate"],
  },
  {
    key: "Q22_Bowel_Habits",
    label: "Bowel Habits",
    options: ["Irregular/constipated", "Regular/loose", "Regular/heavy"],
  },
  {
    key: "Q23_Thirst",
    label: "Thirst Level",
    options: ["Variable", "Excessive", "Moderate"],
  },
  {
    key: "Q24_Mind_Temperament",
    label: "Mind & Temperament",
    options: ["Active/anxious", "Focused/intense", "Calm/steady"],
  },
];

const STEPS = [
  { id: 1, title: "Patient information", fields: ["name", "age", "gender", "lifestyle", "stressLevel"] },
  { id: 2, title: "Symptom entry", fields: ["symptoms", "severity", "duration"] },
  { id: 3, title: "Prakriti questionnaire", fields: ["digestion", "appetite", "sleep", "energy", "bodyTemp", "skinType"] },
];

const symptomTags = symptomCatalog.map((s) => s.name);

export default function PatientAnalysisPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<{
    patientId: string;
    name: string;
    age: string;
    gender: string;
    lifestyle: string;
    stressLevel: number;
    symptoms: string[];
    severity: number;
    duration: string;
    digestion: string;
    appetite: string;
    sleep: string;
    energy: string;
    bodyTemp: string;
    skinType: string;
    Q1_Body_Size: string;
    Q2_Body_Weight: string;
    Q3_Height: string;
    Q4_Bone_Structure: string;
    Q5_Complexion: string;
    Q6_General_Features: string;
    Q7_Skin_Texture: string;
    Q8_Hair_Color: string;
    Q9_Overall_Appearance: string;
    Q10_Eyes_Shape: string;
    Q11_Eyelashes: string;
    Q12_Blinking: string;
    Q13_Cheeks: string;
    Q14_Nose: string;
    Q15_Teeth_Lips: string;
    Q16_Nails: string;
    Q17_Appetite: string;
    Q18_Liking_of_Taste: string;
    Q19_Sleep: string;
    Q20_Energy_Stamina: string;
    Q21_Sweating: string;
    Q22_Bowel_Habits: string;
    Q23_Thirst: string;
    Q24_Mind_Temperament: string;
  }>({
    patientId: "",
    name: "",
    age: "",
    gender: "",
    lifestyle: "",
    stressLevel: 5,
    symptoms: [] as string[],
    severity: 5,
    duration: "",
    digestion: "",
    appetite: "",
    sleep: "",
    energy: "",
    bodyTemp: "",
    skinType: "",
    Q1_Body_Size: "",
    Q2_Body_Weight: "",
    Q3_Height: "",
    Q4_Bone_Structure: "",
    Q5_Complexion: "",
    Q6_General_Features: "",
    Q7_Skin_Texture: "",
    Q8_Hair_Color: "",
    Q9_Overall_Appearance: "",
    Q10_Eyes_Shape: "",
    Q11_Eyelashes: "",
    Q12_Blinking: "",
    Q13_Cheeks: "",
    Q14_Nose: "",
    Q15_Teeth_Lips: "",
    Q16_Nails: "",
    Q17_Appetite: "",
    Q18_Liking_of_Taste: "",
    Q19_Sleep: "",
    Q20_Energy_Stamina: "",
    Q21_Sweating: "",
    Q22_Bowel_Habits: "",
    Q23_Thirst: "",
    Q24_Mind_Temperament: "",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { patients, loading: patientsLoading } = usePatients();
  const [symptomSearch, setSymptomSearch] = useState("");
  const [running, setRunning] = useState(false);

  const applyPatientFromList = useCallback(
    (p: { id: string; name?: string; age?: number | null; gender?: string | null; lifestyle?: string | null; stressLevel?: number | null } | null | undefined) => {
    if (!p) {
      setForm((f) => ({ ...f, patientId: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      patientId: p.id,
      name: p.name ?? "",
      age: p.age != null ? String(p.age) : "",
      gender: p.gender ?? "",
      lifestyle: p.lifestyle ?? "",
      stressLevel: p.stressLevel ?? 5,
    }));
  },
    []
  );

  const newPatientId = searchParams.get("newPatientId");

  useEffect(() => {
    if (patientsLoading || !newPatientId) return;
    const p = patients.find((x) => x.id === newPatientId);
    if (!p) return;
    applyPatientFromList(p);
    navigate("/app/patient-analysis", { replace: true });
  }, [patientsLoading, patients, newPatientId, navigate, applyPatientFromList]);

  const filteredSymptoms = useMemo(() => {
    const q = symptomSearch.trim().toLowerCase();
    if (!q) return symptomCatalog.slice(0, 12);
    return symptomCatalog
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [symptomSearch]);

  const toggleSymptom = (s: string) => {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(s) ? f.symptoms.filter((x) => x !== s) : [...f.symptoms, s],
    }));
  };

  function buildPrakritiPayload(): Record<string, unknown> {
    const g = String(form.gender || "").trim().toLowerCase();
    const gender = g === "female" ? "Female" : "Male";
    const age = parseInt(String(form.age).trim(), 10);
    const answers: Record<string, unknown> = {
      age: Number.isFinite(age) ? age : 25,
      gender,
    };
    for (const q of PRAKRITI_QUESTIONS) {
      answers[q.key] = form[q.key as keyof typeof form];
    }
    return answers;
  }

  function mergePrakritiIntoStored(
    baseResult: Record<string, unknown>,
    p: PrakritiPredictionResponse
  ) {
    const conf01 =
      typeof p.confidence === "number"
        ? p.confidence
        : typeof p.confidence_pct === "number"
          ? p.confidence_pct / 100
          : 0;
    const prakritiBlock = {
      vata: p.vata_pct,
      pitta: p.pitta_pct,
      kapha: p.kapha_pct,
      vata_pct: p.vata_pct,
      pitta_pct: p.pitta_pct,
      kapha_pct: p.kapha_pct,
      dominant: p.dominant_dosha,
      dominant_dosha: p.dominant_dosha,
      confidence: conf01,
      confidence_pct:
        typeof p.confidence_pct === "number"
          ? p.confidence_pct
          : Math.round(conf01 * 1000) / 10,
      lowConfidence: Boolean(p.low_confidence),
      allClassProbabilities: p.all_class_probabilities ?? null,
      topFeatures: p.top_features ?? [],
      interpretation: p.interpretation,
      source: "api" as const,
    };
    const next = { ...baseResult, prakriti: prakritiBlock };
    setJSON(STORAGE_KEYS.latestDiagnosis, next);
  }

  const handleRunDiagnosis = async () => {
    const missingQ = PRAKRITI_QUESTIONS.find((q) => !String(form[q.key as keyof typeof form] ?? "").trim());
    if (missingQ) {
      showToast("Please answer all Prakriti questions", "error");
      return;
    }
    if (!String(form.age ?? "").trim()) {
      showToast("Age is required for Prakriti prediction", "error");
      return;
    }
    const g = String(form.gender || "").trim().toLowerCase();
    if (g !== "male" && g !== "female") {
      showToast("Prakriti model requires gender Male or Female", "error");
      return;
    }

    setRunning(true);
    try {
      const prakritiPayload = buildPrakritiPayload();
      let prakritiApi: PrakritiPredictionResponse | null = null;
      try {
        const { data } = await predictPrakriti(prakritiPayload, {
          patientId: form.patientId || undefined,
          patientName: form.name || undefined,
        });
        prakritiApi = data;
      } catch (e: unknown) {
        let msg = "Prakriti prediction failed";
        if (axios.isAxiosError(e)) {
          const body = e.response?.data as { error?: string; message?: string } | undefined;
          msg = body?.error || body?.message || e.message;
        } else if (e instanceof Error) {
          msg = e.message;
        }
        showToast(msg, "error");
      }

      const result = await runDiagnosis(form);

      if (prakritiApi) {
        mergePrakritiIntoStored(result as Record<string, unknown>, prakritiApi);
        if (prakritiApi.low_confidence) {
          showToast("Low confidence result — please review manually", "warning");
        }
        showToast("AI diagnosis generated", "success");
      } else {
        showToast("Showing demo Prakriti estimates (API unavailable)", "warning");
      }

      void saveDiagnosis(result, form.patientId).catch((err: { message?: string }) => {
        showToast(err?.message || "Failed to save diagnosis", "error");
      });
      navigate("/app/prediction-results");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Diagnosis failed", "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Patient analysis
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Step-based workflow for AI-powered clinical assessment.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <Fragment key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                step === s.id
                  ? "bg-herbal-forest text-white dark:bg-sage-500"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
              )}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : <span>{s.id}</span>}
              {s.title}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-stone-400" />}
          </Fragment>
        ))}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        {running ? (
          <AILoadingState message="Running Prakriti analysis…" />
        ) : null}
        {!running && step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200">
              Step 1 – Patient information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                    Saved patients
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/app/patients/new")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add patient
                  </button>
                </div>
                <select
                  value={form.patientId}
                  disabled={patientsLoading}
                  onChange={(e) => {
                    const id = e.target.value;
                    const p = patients.find((x) => x.id === id);
                    applyPatientFromList(p);
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800"
                >
                  <option value="">
                    {patientsLoading ? "Loading patients…" : "— or select existing patient —"}
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.age ?? "—"} · {p.city ?? "—"}
                    </option>
                  ))}
                </select>
                {form.patientId ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/app/knowledge-assistant?patient=${encodeURIComponent(form.patientId)}`)
                    }
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-herbal-forest/40 bg-white px-4 py-2 text-sm font-medium text-herbal-800 shadow-sm transition hover:bg-emerald-50 dark:border-sage-500/40 dark:bg-stone-800 dark:text-emerald-100 dark:hover:bg-stone-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ask AI about this patient
                  </button>
                ) : null}
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:focus:border-sage-500 dark:focus:ring-sage-500/20"
                  placeholder="Patient name"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Age</span>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
                  placeholder="Age"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Gender</span>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Lifestyle</span>
                <input
                  type="text"
                  value={form.lifestyle}
                  onChange={(e) => setForm((f) => ({ ...f, lifestyle: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
                  placeholder="e.g. Sedentary, Active, Mixed"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  Stress level (1–10)
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.stressLevel}
                  onChange={(e) => setForm((f) => ({ ...f, stressLevel: Number(e.target.value) }))}
                  className="w-full accent-herbal-forest dark:accent-sage-500"
                />
                <span className="mt-1 block text-sm text-stone-500">{form.stressLevel}/10</span>
              </label>
            </div>
          </div>
        )}

        {!running && step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200">
              Step 2 – Symptom entry
            </h2>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                Search symptoms
              </span>
              <input
                type="text"
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                placeholder="Type to filter symptoms (e.g., bloating, anxiety...)"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">
                Select symptoms (multi-select)
              </span>
              <div className="flex flex-wrap gap-2">
                {(symptomSearch ? filteredSymptoms.map((s) => s.name) : symptomTags).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      form.symptoms.includes(s)
                        ? "border-herbal-forest bg-herbal-forest/15 text-herbal-forest dark:border-sage-500 dark:bg-sage-500/20 dark:text-sage-300"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-500"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                Severity (1–10)
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: Number(e.target.value) }))}
                className="w-full accent-herbal-forest dark:accent-sage-500"
              />
              <span className="mt-1 block text-sm text-stone-500">{form.severity}/10</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">Duration</span>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
                placeholder="e.g. 2 weeks, 3 months"
              />
            </label>
          </div>
        )}

        {!running && step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200">
              Prakriti Constitutional Assessment
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Answer all 24 questions for accurate Prakriti prediction
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {PRAKRITI_QUESTIONS.map((q) => (
                <label key={q.key} className="block">
                  <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                    {q.label}
                  </span>
                  <select
                    value={form[q.key as keyof typeof form]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [q.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800"
                    required
                  >
                    <option value="">Select answer...</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {!running ? (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400"
            >
              Previous
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="rounded-lg bg-herbal-forest px-4 py-2 text-sm font-medium text-white dark:bg-sage-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunDiagnosis}
                disabled={running}
                className="flex items-center gap-2 rounded-lg bg-herbal-forest px-6 py-3 text-base font-medium text-white shadow-lg transition hover:opacity-90 dark:bg-sage-500"
              >
                <Sparkles className="h-5 w-5" />
                Run AI diagnosis
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
