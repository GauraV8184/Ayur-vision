import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPatient } from "../../services/patientService";
import { useToast } from "../../components/toast/ToastContext";

const inputClass =
  "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500";

const labelClass = "mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400";

const initialForm = {
  name: "",
  age: "",
  gender: "",
  city: "",
  bloodGroup: "",
  phone: "",
  chiefComplaint: "",
  historyNotes: "",
  allergies: "",
  currentMedications: "",
  lifestyle: "",
  dietType: "",
  stressLevel: 5,
  sleepQuality: "",
  exerciseFrequency: "",
};

export default function NewPatientPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      showToast("Full name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPatient({
        name,
        age: form.age,
        gender: form.gender,
        city: form.city,
        bloodGroup: form.bloodGroup,
        phone: form.phone,
        chiefComplaint: form.chiefComplaint,
        historyNotes: form.historyNotes,
        allergies: form.allergies,
        currentMedications: form.currentMedications,
        lifestyle: form.lifestyle,
        dietType: form.dietType,
        stressLevel: form.stressLevel,
        sleepQuality: form.sleepQuality,
        exerciseFrequency: form.exerciseFrequency,
      });

      if (!created) {
        showToast("Failed to create patient", "error");
        return;
      }
      showToast("Patient saved", "success");
      navigate(`/app/patient-analysis?newPatientId=${created.id}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save patient", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          New patient
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Register a new patient record.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h2 className="mb-4 text-lg font-medium text-stone-800 dark:text-stone-200">
            Personal details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Patient full name"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Age</span>
              <input
                type="number"
                min={0}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                className={inputClass}
                placeholder="Age"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Gender</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>City</span>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className={inputClass}
                placeholder="City"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Blood group</span>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Phone number (optional)</span>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
                placeholder="Phone"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h2 className="mb-4 text-lg font-medium text-stone-800 dark:text-stone-200">
            Clinical intake
          </h2>
          <div className="grid gap-4">
            <label className="block">
              <span className={labelClass}>Chief complaint</span>
              <input
                type="text"
                value={form.chiefComplaint}
                onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                className={inputClass}
                placeholder="Main reason for visit"
              />
            </label>
            <label className="block">
              <span className={labelClass}>History notes</span>
              <textarea
                rows={4}
                value={form.historyNotes}
                onChange={(e) => setForm((f) => ({ ...f, historyNotes: e.target.value }))}
                className={inputClass}
                placeholder="Past illnesses, surgeries, medications"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Known allergies</span>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                className={inputClass}
                placeholder="Known allergies"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Current medications</span>
              <input
                type="text"
                value={form.currentMedications}
                onChange={(e) => setForm((f) => ({ ...f, currentMedications: e.target.value }))}
                className={inputClass}
                placeholder="Current medications"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <h2 className="mb-4 text-lg font-medium text-stone-800 dark:text-stone-200">
            Lifestyle & constitution
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Lifestyle</span>
              <input
                type="text"
                value={form.lifestyle}
                onChange={(e) => setForm((f) => ({ ...f, lifestyle: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Sedentary, Active, Mixed"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Diet type</span>
              <select
                value={form.dietType}
                onChange={(e) => setForm((f) => ({ ...f, dietType: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-vegetarian">Non-vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Stress level (1–10)</span>
              <input
                type="range"
                min={1}
                max={10}
                value={form.stressLevel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stressLevel: Number(e.target.value) }))
                }
                className="w-full accent-herbal-forest dark:accent-sage-500"
              />
              <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
                {form.stressLevel}/10
              </span>
            </label>
            <label className="block">
              <span className={labelClass}>Sleep quality</span>
              <select
                value={form.sleepQuality}
                onChange={(e) => setForm((f) => ({ ...f, sleepQuality: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Exercise frequency</span>
              <select
                value={form.exerciseFrequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, exerciseFrequency: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="Daily">Daily</option>
                <option value="3–4x/week">3–4x/week</option>
                <option value="Rarely">Rarely</option>
                <option value="Never">Never</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/app/patient-analysis")}
            className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 dark:border-stone-600 dark:text-stone-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-herbal-forest px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-sage-500"
          >
            {submitting ? "Saving…" : "Save patient"}
          </button>
        </div>
      </form>
    </div>
  );
}
