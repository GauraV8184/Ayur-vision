import { supabase } from "../lib/supabase";

function mapPatientRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    age: row.age as number | null,
    gender: row.gender as string | null,
    city: row.city as string | null,
    lifestyle: row.lifestyle as string | null,
    stressLevel: row.stress_level as number | null,
    chiefComplaint: row.chief_complaint as string | null,
    historyNotes: row.history_notes as string | null,
    lastVisit: row.last_visit as string,
    createdAt: row.created_at as string,
    bloodGroup: row.blood_group as string | null,
    phone: row.phone as string | null,
    allergies: row.allergies as string | null,
    currentMedications: row.current_medications as string | null,
    dietType: row.diet_type as string | null,
    sleepQuality: row.sleep_quality as string | null,
    exerciseFrequency: row.exercise_frequency as string | null,
  };
}

function buildPatientInsertPayload(
  data: Record<string, unknown>,
  doctorId: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    doctor_id: doctorId,
    name: data.name,
  };
  if (data.age != null && data.age !== "") {
    const n = Number(data.age);
    if (!Number.isNaN(n)) payload.age = n;
  }
  if (data.gender != null && data.gender !== "") payload.gender = data.gender;
  if (data.city != null && data.city !== "") payload.city = data.city;
  if (data.lifestyle != null && data.lifestyle !== "") payload.lifestyle = data.lifestyle;
  if (data.stressLevel != null && data.stressLevel !== "") {
    payload.stress_level = Number(data.stressLevel);
  }
  if (data.chiefComplaint != null && data.chiefComplaint !== "") {
    payload.chief_complaint = data.chiefComplaint;
  }
  if (data.historyNotes != null && data.historyNotes !== "") {
    payload.history_notes = data.historyNotes;
  }
  if (data.bloodGroup) payload.blood_group = data.bloodGroup;
  if (data.phone) payload.phone = data.phone;
  if (data.allergies) payload.allergies = data.allergies;
  if (data.currentMedications) payload.current_medications = data.currentMedications;
  if (data.dietType) payload.diet_type = data.dietType;
  if (data.sleepQuality) payload.sleep_quality = data.sleepQuality;
  if (data.exerciseFrequency) payload.exercise_frequency = data.exerciseFrequency;
  return payload;
}

export async function getPatients() {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("doctor_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => mapPatientRow(r as Record<string, unknown>));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
}

export async function getPatientById(id: string) {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("doctor_id", uid)
      .maybeSingle();

    if (error) throw error;
    return data
      ? mapPatientRow(data as Record<string, unknown>)
      : null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
}

export async function createPatient(
  data: Record<string, unknown>
) {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");

    const payload = buildPatientInsertPayload(data, uid);

    const { data: inserted, error } = await supabase
      .from("patients")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return inserted ? mapPatientRow(inserted as Record<string, unknown>) : null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
}

export async function saveDiagnosis(
  diagnosisResult: Record<string, unknown>,
  patientId: string | null
) {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");

    const id = diagnosisResult?.id;
    if (!id) throw new Error("Diagnosis result missing id");

    const row = {
      id,
      doctor_id: uid,
      result: diagnosisResult,
      patient_id:
        patientId && String(patientId).trim() && String(patientId).trim() !== "NEW"
          ? String(patientId).trim()
          : null,
    };

    const { error } = await supabase.from("diagnoses").insert(row);
    if (error) throw error;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  }
}
