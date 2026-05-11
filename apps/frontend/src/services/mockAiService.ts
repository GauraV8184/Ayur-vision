import { symptomCatalog } from "../__mocks__/mockSymptoms";
import { herbCatalog } from "../__mocks__/mockHerbs";
import { conditionCatalog } from "../__mocks__/mockClinical";
import { STORAGE_KEYS, setJSON, prependActivity } from "../utils/storage";
import { predictDisease } from "./api";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeDoshaScores(scores: {
  vata: number;
  pitta: number;
  kapha: number;
}) {
  const total = scores.vata + scores.pitta + scores.kapha || 1;
  return {
    vata: Math.round((scores.vata / total) * 100),
    pitta: Math.round((scores.pitta / total) * 100),
    kapha: Math.round((scores.kapha / total) * 100),
  };
}

function dominantPrakritiLabelFromPercents(prakriti: {
  vata: number;
  pitta: number;
  kapha: number;
}): string {
  const rows: [string, number][] = [
    ["Vata", prakriti.vata],
    ["Pitta", prakriti.pitta],
    ["Kapha", prakriti.kapha],
  ];
  rows.sort((a, b) => b[1] - a[1]);
  const [d1, s1] = rows[0];
  const [d2, s2] = rows[1];
  if (s1 - s2 >= 10) return d1;
  const pair = new Set([d1, d2]);
  if (pair.has("Vata") && pair.has("Pitta")) return "Pitta-Vata";
  if (pair.has("Pitta") && pair.has("Kapha")) return "Kapha-Pitta";
  if (pair.has("Vata") && pair.has("Kapha")) return "Kapha-Vata";
  return d1;
}

function buildImbalance(prakriti: {
  vata: number;
  pitta: number;
  kapha: number;
}) {
  // Interpret "elevation" as higher than 45%, low under 25% for a demo meter
  const mk = (label: string, val: number) => {
    const status = val >= 45 ? "elevated" : val <= 25 ? "low" : "normal";
    return { level: clamp(val + (status === "elevated" ? 20 : status === "low" ? -5 : 0), 10, 95), status, label };
  };
  return {
    vata: mk("Vata", prakriti.vata),
    pitta: mk("Pitta", prakriti.pitta),
    kapha: mk("Kapha", prakriti.kapha),
  };
}

function pickHerbs({
  prakriti,
  selectedSymptomNames,
}: {
  prakriti: { vata: number; pitta: number; kapha: number };
  selectedSymptomNames: string[];
}) {
  // Simple recommendation logic: match indication keywords + dosha direction
  const symptomSet = new Set(selectedSymptomNames.map((s) => s.toLowerCase()));

  const scored = herbCatalog.map((h) => {
    let score = 0;
    for (const ind of h.indications as string[]) {
      if (symptomSet.has(ind.toLowerCase())) score += 3;
      // partial matching for common phrases
      if ([...symptomSet].some((s) => ind.toLowerCase().includes(s))) score += 1;
    }
    // prefer vata-pacifying herbs when vata high, etc.
    if (prakriti.vata >= 40 && (h.doshaEffect.vata === "↓" || String(h.doshaEffect.vata).includes("↓"))) score += 2;
    if (prakriti.pitta >= 40 && (h.doshaEffect.pitta === "↓" || String(h.doshaEffect.pitta).includes("↓"))) score += 2;
    if (prakriti.kapha >= 40 && (h.doshaEffect.kapha === "↓" || String(h.doshaEffect.kapha).includes("↓"))) score += 2;
    return { herb: h, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ herb }) => ({
      id: herb.id,
      plantName: herb.plantName,
      botanicalName: herb.botanicalName,
      doshaEffect: `V:${herb.doshaEffect.vata} P:${herb.doshaEffect.pitta} K:${herb.doshaEffect.kapha}`,
      therapeuticUses: herb.primaryActions.join(", "),
      preparation: herb.preparation,
      imagePlaceholder: herb.imagePlaceholder,
      cautions: herb.cautions,
      indications: herb.indications,
    }));
}

function mockPredictConditions(selectedSymptomNames: string[]) {
  const set = new Set(selectedSymptomNames);
  const scored = conditionCatalog.map((c) => {
    const matches = c.symptoms.filter((s) => set.has(s)).length;
    return { condition: c.name, matches, bias: c.doshaBias };
  });
  const sorted = scored.sort((a, b) => b.matches - a.matches);
  const top = sorted.slice(0, 3);
  return top.map((t, i) => {
    const probability = clamp(0.55 + t.matches * 0.12 - i * 0.06, 0.45, 0.92);
    return {
      condition: t.condition,
      probability,
      explanation:
        t.matches > 0
          ? `Matched symptoms: ${t.matches}. Pattern aligns with Ayurvedic presentation in the knowledge base.`
          : "Pattern inferred from overall profile and questionnaire answers.",
    };
  });
}

async function predictConditionsFromApi(selectedSymptomNames: string[]) {
  try {
    const { data } = await predictDisease(selectedSymptomNames, 5);
    return data.diseases.map((d) => ({
      condition: d.disease,
      probability: d.probability,
      explanation: `Model estimate (${data.model_version}): ${d.confidence.toFixed(1)}% probability; ${d.matched_symptoms} input symptoms matched the classifier vocabulary.`,
    }));
  } catch {
    return mockPredictConditions(selectedSymptomNames);
  }
}

export async function runDiagnosis(input: Record<string, unknown>) {
  const selectedSymptomNamesUnknown =
    Array.isArray(input.symptoms) ? (input.symptoms as unknown[]) : [];
  const selected = selectedSymptomNamesUnknown.map((name: unknown) => {
    return (
      symptomCatalog.find((s) => s.name === (name as string)) || null
    );
  });

  // Baseline dosha scores (starting from neutral)
  let scores = { vata: 1, pitta: 1, kapha: 1 };

  // Stress tends to elevate Vata/Pitta
  const stress = Number(input.stressLevel ?? 5);
  scores.vata += stress * 0.12;
  scores.pitta += stress * 0.08;

  // Lifestyle hints
  const lifestyle = String(input.lifestyle ?? "").toLowerCase();
  if (lifestyle.includes("sedent")) scores.kapha += 1.2;
  if (lifestyle.includes("travel") || lifestyle.includes("irregular")) scores.vata += 1.0;
  if (lifestyle.includes("spicy")) scores.pitta += 1.2;

  // Symptom hints (weighted)
  for (const s of selected) {
    if (!s) continue;
    scores.vata += (s.doshaHint.vata || 0) * 2.0;
    scores.pitta += (s.doshaHint.pitta || 0) * 2.0;
    scores.kapha += (s.doshaHint.kapha || 0) * 2.0;
  }

  const prakritiBase = normalizeDoshaScores(scores);
  const dominantLabel = dominantPrakritiLabelFromPercents(prakritiBase);
  const prakriti = {
    ...prakritiBase,
    dominant: dominantLabel,
    dominant_dosha: dominantLabel,
    source: "mock" as const,
  };
  const doshaImbalance = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.latestDiagnosis);
      const latest = raw ? (JSON.parse(raw) as any) : null;
      const apiPrakriti = latest?.prakriti;

      if (apiPrakriti?.source === "api") {
        const mk = (label: string, pct: number) => {
          const level = clamp(pct, 0, 100);
          const status = level >= 50 ? "elevated" : level <= 30 ? "low" : "normal";
          return { level, status, label };
        };

        return {
          vata: mk("Vata", Number(apiPrakriti.vata_pct)),
          pitta: mk("Pitta", Number(apiPrakriti.pitta_pct)),
          kapha: mk("Kapha", Number(apiPrakriti.kapha_pct)),
        };
      }
    } catch {
      // ignore storage parsing issues and fall back to demo thresholds
    }

    return buildImbalance(prakritiBase);
  })();

  const selectedSymptomNames = selectedSymptomNamesUnknown
    .slice(0, 12)
    .map((n) => String(n));
  const diseasePredictions = await predictConditionsFromApi(selectedSymptomNames);

  const herbalRecommendations = pickHerbs({ prakriti, selectedSymptomNames });

  // Diet/lifestyle suggestions are made to match dosha trend
  const dietLifestyle = {
    recommended: [
      prakriti.vata >= 40 ? "Warm, oily, nourishing meals" : "Warm cooked meals",
      prakriti.pitta >= 40 ? "Cooling foods (coconut, cucumber)" : "Regular meal timing",
      prakriti.kapha >= 40 ? "Light dinner, avoid daytime naps" : "Adequate hydration (warm water)",
      "Mindful eating, minimal distractions",
    ],
    avoid: [
      prakriti.vata >= 40 ? "Excess dry snacks" : "Late-night heavy meals",
      prakriti.pitta >= 40 ? "Excess spicy/acidic foods" : "Cold drinks",
      prakriti.kapha >= 40 ? "Excess sweets and dairy" : "Highly processed foods",
    ],
    lifestyle: [
      prakriti.vata >= 40 ? "Abhyanga (oil massage) 3–4x/week" : "Daily walk 20–30 min",
      prakriti.pitta >= 40 ? "Breathwork (sheetali), cool-down routines" : "Pranayama (gentle)",
      prakriti.kapha >= 40 ? "Morning movement + early light dinner" : "Consistent sleep schedule",
    ],
    dailyRoutine: [
      "Wake by 6–7 AM",
      "Main meal at noon",
      "Light dinner by 7–8 PM",
      "Digital wind-down 45 min before bed",
    ],
  };

  const result = {
    id: `DX-${Date.now()}`,
    createdAt: new Date().toISOString(),
    patient: {
      id: (input.patientId as string) || "NEW",
      name: (input.name as string) || "Unnamed",
      age: (input.age as string) || "",
      gender: (input.gender as string) || "",
      lifestyle: (input.lifestyle as string) || "",
      stressLevel: Number(input.stressLevel ?? 5) || 5,
    },
    input: {
      symptoms: selectedSymptomNames,
      severity: Number(input.severity ?? 5),
      duration: (input.duration as string) ?? "",
      questionnaire: {
        digestion: (input.digestion as string) ?? "",
        appetite: (input.appetite as string) ?? "",
        sleep: (input.sleep as string) ?? "",
        energy: (input.energy as string) ?? "",
        bodyTemp: (input.bodyTemp as string) ?? "",
        skinType: (input.skinType as string) ?? "",
      },
    },
    prakriti,
    doshaImbalance,
    diseasePredictions,
    herbalRecommendations,
    dietLifestyle,
  };

  // Persist latest diagnosis and activity
  setJSON(STORAGE_KEYS.latestDiagnosis, result);
  prependActivity({
    id: result.id,
    patient: result.patient.name,
    action: "Full AI diagnosis",
    time: "just now",
    type: "diagnosis",
  });

  return result;
}

/** @deprecated Use runDiagnosis — kept for older imports */
export const runMockDiagnosis = runDiagnosis;

