import { STORAGE_KEYS, getJSON } from "./storage";

interface Prakriti {
  vata: number;
  pitta: number;
  kapha: number;
}

interface DiagnosisData {
  patient?: { name?: string };
  createdAt?: string;
  prakriti?: Prakriti;
  diseasePredictions?: { condition: string }[];
  herbalRecommendations?: { plantName: string }[];
  herbs?: { plantName: string }[];
}

export function formatReportDate(isoString: string): string {
  if (!isoString) return "Not available";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Not available";
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function getDominantDosha(
  prakriti: Prakriti | null | undefined
): string | null {
  if (!prakriti) return null;
  const entries: [string, number][] = [
    ["Vata", prakriti.vata ?? 0],
    ["Pitta", prakriti.pitta ?? 0],
    ["Kapha", prakriti.kapha ?? 0],
  ];
  const [dosha] = entries.reduce(
    (max, current) => (current[1] > max[1] ? current : max),
    ["Vata", 0]
  );
  return dosha;
}

export function buildShareText(data: DiagnosisData | null): string {
  if (!data) {
    const latest = getJSON<DiagnosisData | null>(
      STORAGE_KEYS.latestDiagnosis,
      null
    );
    if (!latest)
      return "AyurVision Report: No diagnosis data available.";
    data = latest;
  }
  const name = data.patient?.name || "Unknown patient";
  const date = formatReportDate(data.createdAt ?? "");
  const prakriti = data.prakriti ?? { vata: 0, pitta: 0, kapha: 0 };
  const dominant = getDominantDosha(prakriti) || "N/A";
  const topConditions =
    (data.diseasePredictions || [])
      .slice(0, 2)
      .map((d) => d.condition)
      .join(", ") || "N/A";
  const herbs =
    (data.herbalRecommendations || data.herbs || [])
      .slice(0, 2)
      .map((h) => h.plantName)
      .join(", ") || "N/A";
  return [
    `AyurVision Report — ${name}`,
    `Generated: ${date}`,
    `Prakriti: Vata ${prakriti.vata}% | Pitta ${prakriti.pitta}% | Kapha ${prakriti.kapha}%`,
    `Dominant Dosha: ${dominant}`,
    `Top Conditions: ${topConditions}`,
    `Herbs Recommended: ${herbs}`,
  ].join("\n");
}

