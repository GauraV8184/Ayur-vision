import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Leaf } from "lucide-react";
import { medicinalPlants } from "../../__mocks__/mockPlants";
import { uploadImage } from "../../services/api";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { useToast } from "../../components/toast/ToastContext";

export default function PlantLibraryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [filterDosha, setFilterDosha] = useState("");
  const [filterDisease, setFilterDisease] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [plantPrediction, setPlantPrediction] = useState<{
    plant: string;
    confidence: number;
  } | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const handleFileChange = (
    fileOrEvent: React.ChangeEvent<HTMLInputElement> | File
  ) => {
    const file =
      "target" in fileOrEvent
        ? fileOrEvent.target.files?.[0] ?? null
        : fileOrEvent;
    setSelectedFile(file || null);
    setUploadError("");
    setUploadSuccess("");
    setPlantPrediction(null);
    if (file) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl("");
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an image to upload.");
      return;
    }
    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");
    const formData = new FormData();
    formData.append("image", selectedFile);
    try {
      const res = await uploadImage(formData);
      const { plant, confidence } = res.data;
      if (plant != null && confidence != null) {
        setPlantPrediction({ plant, confidence });
        setUploadSuccess("Plant identified.");
        showToast(`Plant: ${plant} (${(confidence * 100).toFixed(0)}% confidence)`, "success");
      } else {
        setPlantPrediction(null);
        // setUploadSuccess("Image uploaded.");
        showToast("Image uploaded successfully", "success");
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { message?: string; error?: string };
        };
      };
      if (axiosErr.response?.status === 401) {
        setUploadError("Session expired. Please log in again.");
        setTimeout(() => navigate("/login"), 1000);
        return;
      }
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        "Upload failed. Please try again.";
      setUploadError(msg);
      showToast(msg, "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const filtered = medicinalPlants.filter((p) => {
    const matchSearch =
      p.plantName.toLowerCase().includes(search.toLowerCase()) ||
      p.botanicalName.toLowerCase().includes(search.toLowerCase()) ||
      p.therapeuticUses.toLowerCase().includes(search.toLowerCase());
    const matchDosha = !filterDosha || p.doshaImpact.toLowerCase().includes(filterDosha.toLowerCase());
    return matchSearch && matchDosha;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Medicinal plant library
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Searchable reference of plants with therapeutic uses and dosha impact.
        </p>
      </div>

      {/* Plant identification — upload leaf image for AI classification */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-800 dark:text-stone-200">
          <Leaf className="h-5 w-5 text-herbal-forest dark:text-sage-400" />
          Identify medicinal plant
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Upload a leaf image to classify it with the AI model.
        </p>
        <form onSubmit={handleUpload} className="space-y-4">
          <FileUpload label="Upload plant / leaf image" onFileSelected={handleFileChange} />
          {previewUrl && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800">
              <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">Preview</p>
              <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg object-contain" />
            </div>
          )}
          {uploadError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {uploadError}
            </div>
          )}
          {uploadSuccess && !plantPrediction && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              {uploadSuccess}
            </div>
          )}
          <Button type="submit" loading={uploadLoading} disabled={!selectedFile}>
            {uploadLoading ? "Uploading & analysing…" : "Upload and identify"}
          </Button>
        </form>
        {plantPrediction && (
  <div className="mt-6 rounded-lg border border-herbal-forest/30 bg-herbal-forest/5 p-4 dark:border-sage-500/30 dark:bg-sage-500/10">
    <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
      Plant identification
    </p>

    <p className="mt-1 text-xl font-semibold text-stone-900 dark:text-stone-100">
      {plantPrediction.plant}
    </p>

    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
      Confidence: {(plantPrediction.confidence * 100).toFixed(0)}%
    </p>
  </div>
)}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, botanical name, or uses..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-stone-900 placeholder:text-stone-400 focus:border-herbal-forest focus:ring-2 focus:ring-herbal-forest/20 dark:border-stone-600 dark:bg-stone-800 dark:focus:border-sage-500 dark:focus:ring-sage-500/20"
          />
        </div>
        <select
          value={filterDosha}
          onChange={(e) => setFilterDosha(e.target.value)}
          className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-700 focus:border-herbal-forest dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
        >
          <option value="">All doshas</option>
          <option value="vata">Vata</option>
          <option value="pitta">Pitta</option>
          <option value="kapha">Kapha</option>
          <option value="tridoshic">Tridoshic</option>
        </select>
        <select
          value={filterDisease}
          onChange={(e) => setFilterDisease(e.target.value)}
          className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-700 focus:border-herbal-forest dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
        >
          <option value="">All conditions</option>
          <option value="digestion">Digestion</option>
          <option value="stress">Stress</option>
          <option value="skin">Skin</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card dark:border-stone-700 dark:bg-stone-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                <th className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  Plant name
                </th>
                <th className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  Botanical name
                </th>
                <th className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  Therapeutic uses
                </th>
                <th className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  Dosha impact
                </th>
                <th className="px-4 py-3 font-semibold text-stone-700 dark:text-stone-300">
                  Part used
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                    {p.plantName}
                  </td>
                  <td className="px-4 py-3 italic text-stone-600 dark:text-stone-400">
                    {p.botanicalName}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                    {p.therapeuticUses}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                    {p.doshaImpact}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                    {p.partUsed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-stone-500 dark:text-stone-400">
            No plants match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
