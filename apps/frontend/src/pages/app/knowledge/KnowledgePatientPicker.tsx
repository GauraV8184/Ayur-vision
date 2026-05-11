import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import type { Patient } from "../../../hooks/usePatients";

interface KnowledgePatientPickerProps {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  loading: boolean;
  onSelect: (patientId: string) => void;
}

export default function KnowledgePatientPicker({
  open,
  onClose,
  patients,
  loading,
  onSelect,
}: KnowledgePatientPickerProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p) => {
      const blob = `${p.name} ${p.age ?? ""} ${p.chiefComplaint ?? ""} ${p.city ?? ""}`.toLowerCase();
      return blob.includes(s);
    });
  }, [patients, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[min(480px,80vh)] w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-picker-title"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
          <h2 id="patient-picker-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Select patient
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-stone-200 px-4 py-2 dark:border-stone-700">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, complaint…"
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[min(360px,60vh)] overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-stone-500">Loading patients…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-stone-500">No matching patients.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setQ("");
                      onClose();
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-emerald-50 dark:hover:bg-stone-800"
                  >
                    <div className="font-medium text-stone-900 dark:text-stone-100">{p.name}</div>
                    <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {p.age != null ? `${p.age} yrs` : "Age —"}
                      {" · "}
                      {p.chiefComplaint?.trim() ? p.chiefComplaint : "No chief complaint recorded"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
