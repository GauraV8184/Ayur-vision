import { supabase } from "../config/supabase.js";

export type PatientSummaryLight = {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  chiefComplaint: string | null;
};

export type PatientKnowledgeBundle = {
  patient: {
    id: string;
    name: string;
    age: number | null;
    gender: string | null;
    chiefComplaint: string | null;
    historyNotes: string | null;
    allergies: string | null;
    currentMedications: string | null;
    lifestyle: string | null;
    stressLevel: number | null;
    sleepQuality: string | null;
    dietType: string | null;
    city: string | null;
    bloodGroup: string | null;
    lastVisit: string | null;
  };
  summaryText: string;
  facts: string[];
  missingData: string[];
};

function nz(s: unknown): string | null {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ensures the patient exists and belongs to the requesting doctor. Returns null if denied or missing.
 */
export async function fetchPatientForDoctor(
  doctorId: string,
  patientId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (error) {
    console.error("[patientKnowledgeContext] fetch_patient", error.message);
    return null;
  }
  return data as Record<string, unknown> | null;
}

function rowToPatientFields(row: Record<string, unknown>): PatientKnowledgeBundle["patient"] {
  return {
    id: String(row.id),
    name: nz(row.name) ?? "Unknown",
    age: numOrNull(row.age),
    gender: nz(row.gender),
    chiefComplaint: nz(row.chief_complaint),
    historyNotes: nz(row.history_notes),
    allergies: nz(row.allergies),
    currentMedications: nz(row.current_medications),
    lifestyle: nz(row.lifestyle),
    stressLevel: numOrNull(row.stress_level),
    sleepQuality: nz(row.sleep_quality),
    dietType: nz(row.diet_type),
    city: nz(row.city),
    bloodGroup: nz(row.blood_group),
    lastVisit: row.last_visit != null ? String(row.last_visit) : null,
  };
}

async function fetchLatestPrakritiLine(patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("prakriti_results")
    .select("vata_pct, pitta_pct, kapha_pct, dominant_dosha, interpretation, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const v = numOrNull(r.vata_pct);
  const pi = numOrNull(r.pitta_pct);
  const k = numOrNull(r.kapha_pct);
  const dom = nz(r.dominant_dosha);
  const interp = nz(r.interpretation);
  const bits: string[] = [];
  if (v != null && pi != null && k != null) {
    bits.push(`Prakriti scores (V/P/K): ${v}% / ${pi}% / ${k}%`);
  }
  if (dom) bits.push(`Dominant dosha (assessment): ${dom}`);
  if (interp) bits.push(`Interpretation summary: ${interp.slice(0, 400)}${interp.length > 400 ? "…" : ""}`);
  return bits.length ? bits.join(" | ") : null;
}

async function fetchLatestDiagnosisSummary(doctorId: string, patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("diagnoses")
    .select("result, created_at")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const result = (data as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const o = result as Record<string, unknown>;
  const parts: string[] = [];
  const prak = o.prakriti as Record<string, unknown> | undefined;
  if (prak && typeof prak === "object") {
    const d = nz(prak.dominant_dosha ?? prak.dominant);
    if (d) parts.push(`Stored diagnosis prakriti emphasis: ${d}`);
  }
  const diseases = o.diseasePredictions;
  if (Array.isArray(diseases) && diseases.length) {
    const top = diseases[0] as { condition?: unknown; probability?: unknown };
    const cond = nz(top.condition);
    const prob = numOrNull(top.probability);
    if (cond) parts.push(`Latest disease prediction (model): ${cond}${prob != null ? ` (~${Math.round(prob * 100)}%)` : ""}`);
  }
  return parts.length ? parts.join(" | ") : "Prior AI diagnosis record on file (details omitted for brevity).";
}

function collectMissing(p: PatientKnowledgeBundle["patient"]): string[] {
  const missing: string[] = [];
  if (p.age == null) missing.push("age");
  if (!p.gender) missing.push("gender");
  if (!p.chiefComplaint) missing.push("chief complaint");
  if (!p.historyNotes) missing.push("history notes");
  if (!p.allergies) missing.push("allergies");
  if (!p.currentMedications) missing.push("current medications");
  if (!p.lifestyle) missing.push("lifestyle");
  if (p.stressLevel == null) missing.push("stress level");
  if (!p.sleepQuality) missing.push("sleep quality");
  if (!p.dietType) missing.push("diet");
  return missing;
}

function collectFacts(p: PatientKnowledgeBundle["patient"]): string[] {
  const facts: string[] = [];
  facts.push(`Name: ${p.name}`);
  if (p.age != null) facts.push(`Age: ${p.age}`);
  if (p.gender) facts.push(`Gender: ${p.gender}`);
  if (p.city) facts.push(`Location: ${p.city}`);
  if (p.bloodGroup) facts.push(`Blood group: ${p.bloodGroup}`);
  if (p.chiefComplaint) facts.push(`Chief complaint: ${p.chiefComplaint}`);
  if (p.historyNotes) facts.push(`History: ${p.historyNotes}`);
  if (p.allergies) facts.push(`Allergies: ${p.allergies}`);
  if (p.currentMedications) facts.push(`Current medications: ${p.currentMedications}`);
  if (p.lifestyle) facts.push(`Lifestyle: ${p.lifestyle}`);
  if (p.stressLevel != null) facts.push(`Stress level (1–10): ${p.stressLevel}`);
  if (p.sleepQuality) facts.push(`Sleep: ${p.sleepQuality}`);
  if (p.dietType) facts.push(`Diet: ${p.dietType}`);
  if (p.lastVisit) facts.push(`Last visit date: ${p.lastVisit}`);
  return facts;
}

/**
 * Builds compact runtime context for RAG + LLM. Not stored in vector DB.
 */
export async function buildPatientKnowledgeContext(
  doctorId: string,
  patientId: string
): Promise<PatientKnowledgeBundle | null> {
  const row = await fetchPatientForDoctor(doctorId, patientId);
  if (!row) return null;

  const patient = rowToPatientFields(row);
  const facts = collectFacts(patient);
  const missingData = collectMissing(patient);

  const [prakLine, dxLine] = await Promise.all([
    fetchLatestPrakritiLine(patientId),
    fetchLatestDiagnosisSummary(doctorId, patientId),
  ]);

  const extraLines: string[] = [];
  if (prakLine) extraLines.push(`Latest Prakriti result: ${prakLine}`);
  if (dxLine) extraLines.push(`Latest stored diagnosis snapshot: ${dxLine}`);

  const summaryParts = [
    `Patient: ${patient.name}${patient.age != null ? `, age ${patient.age}` : ""}${patient.gender ? `, ${patient.gender}` : ""}.`,
    patient.chiefComplaint ? `Chief complaint: ${patient.chiefComplaint}` : null,
    ...extraLines,
    missingData.length
      ? `Missing or incomplete chart fields: ${missingData.join(", ")}.`
      : null,
  ].filter(Boolean);

  const summaryText = summaryParts.join("\n");

  return {
    patient,
    summaryText,
    facts,
    missingData,
  };
}

export function patientRowToSummaryLight(row: Record<string, unknown>): PatientSummaryLight {
  return {
    id: String(row.id),
    name: nz(row.name) ?? "Unknown",
    age: numOrNull(row.age),
    gender: nz(row.gender),
    chiefComplaint: nz(row.chief_complaint),
  };
}

/**
 * Plain-text block for the LLM (AyurVision clinical knowledge assistant).
 */
export function formatClinicalContextPromptBlock(bundle: PatientKnowledgeBundle): string {
  const p = bundle.patient;
  const header =
    "You are assisting with an individual patient chart. The following PATIENT CONTEXT is supplied by the clinician/system. " +
    "Treat it as factual only when explicitly present; do not invent vitals, diagnoses, or history.\n\n";

  const demographics = [
    `- ID: ${p.id}`,
    `- Name: ${p.name}`,
    p.age != null ? `- Age: ${p.age}` : `- Age: not recorded`,
    p.gender ? `- Gender: ${p.gender}` : `- Gender: not recorded`,
    p.city ? `- City: ${p.city}` : null,
    p.bloodGroup ? `- Blood group: ${p.bloodGroup}` : null,
    p.lastVisit ? `- Last visit: ${p.lastVisit}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const clinical = [
    p.chiefComplaint ? `- Chief complaint: ${p.chiefComplaint}` : `- Chief complaint: not recorded`,
    p.historyNotes ? `- History notes: ${p.historyNotes}` : null,
    p.allergies ? `- Allergies: ${p.allergies}` : `- Allergies: not recorded`,
    p.currentMedications ? `- Current medications: ${p.currentMedications}` : `- Current medications: not recorded`,
    p.lifestyle ? `- Lifestyle: ${p.lifestyle}` : null,
    p.stressLevel != null ? `- Stress (1–10): ${p.stressLevel}` : null,
    p.sleepQuality ? `- Sleep quality: ${p.sleepQuality}` : null,
    p.dietType ? `- Diet: ${p.dietType}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const missing =
    bundle.missingData.length > 0
      ? `\nFields not documented in chart: ${bundle.missingData.join(", ")}.\n`
      : "\n";

  return (
    `${header}` +
      `PATIENT CONTEXT\n` +
      `Demographics:\n${demographics}\n\n` +
      `Clinical notes:\n${clinical}\n` +
      `${missing}` +
      `Structured summary:\n${bundle.summaryText}`
  );
}
