import { User, Users, X } from "lucide-react";

interface KnowledgePatientContextBarProps {
  contextMode: "general" | "patient";
  patientDisplayName?: string | null;
  disabled?: boolean;
  onOpenPicker: () => void;
  onClearPatient: () => void;
}

export default function KnowledgePatientContextBar({
  contextMode,
  patientDisplayName,
  disabled,
  onOpenPicker,
  onClearPatient,
}: KnowledgePatientContextBarProps) {
  const isPatient = contextMode === "patient" && Boolean(patientDisplayName);

  return (
    <div className="mb-4 shrink-0 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isPatient
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100"
              : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
          }`}
        >
          {isPatient ? "Patient context" : "General knowledge"}
        </span>
        {isPatient && (
          <span className="flex items-center gap-1 text-sm text-stone-700 dark:text-stone-300">
            <User className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate font-medium">{patientDisplayName}</span>
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenPicker}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <Users className="h-3.5 w-3.5" />
            {isPatient ? "Change patient" : "Select patient"}
          </button>
          {isPatient && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearPatient}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear patient
            </button>
          )}
        </div>
      </div>
      {isPatient && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Answers will use this patient&apos;s profile together with Ayurvedic knowledge sources.
        </p>
      )}
    </div>
  );
}
