import { useState, useEffect, useCallback } from "react";
import * as patientService from "../services/patientService";
import { useToast } from "../components/toast/ToastContext";

// Mirrors the `public.patients` table in `apps/backend/db/schema.sql`.
export interface Patient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  lifestyle: string | null;
  city: string | null;
  stressLevel: number | null;
  chiefComplaint: string | null;
  historyNotes: string | null;
  lastVisit: string;
  createdAt: string;
  bloodGroup: string | null;
  phone: string | null;
  allergies: string | null;
  currentMedications: string | null;
  dietType: string | null;
  sleepQuality: string | null;
  exerciseFrequency: string | null;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getPatients();
      setPatients(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load patients";
      setError(msg);
      showToast(msg, "error");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addPatient = useCallback(
    async (formData: unknown) => {
      const created = await patientService.createPatient(
        formData as Record<string, unknown>
      );
      if (created) setPatients((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  return { patients, loading, error, addPatient, refetch };
}
