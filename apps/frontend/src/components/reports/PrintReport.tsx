import { useMemo } from "react";
import type { CSSProperties } from "react";
import { formatReportDate, getDominantDosha } from "../../utils/reportHelpers";

interface DoshaEntry {
  level: number;
  status: string;
  label: string;
}

interface DiseasePrediction {
  condition: string;
  probability: number;
  explanation?: string;
}

interface HerbalRecommendation {
  id?: string | number;
  plantName?: string;
  botanicalName?: string;
  doshaEffect?: string;
  preparation?: string;
  cautions?: string[];
  therapeuticUses?: string;
}

interface DietLifestyle {
  recommended: string[];
  avoid: string[];
  lifestyle: string[];
  dailyRoutine: string[];
}

interface Prakriti {
  vata: number;
  pitta: number;
  kapha: number;
}

interface DiagnosisData {
  id?: string;
  createdAt?: string;
  prakriti?: Prakriti | null;
  patient?: {
    id?: string;
    name?: string;
    age?: string | number | null;
    gender?: string | null;
    city?: string | null;
    chiefComplaint?: string | null;
    lifestyle?: string | null;
    stressLevel?: number | null;
    historyNotes?: string | null;
  } | null;
  doshaImbalance?: Record<string, DoshaEntry> | null;
  diseasePredictions?: DiseasePrediction[] | null;
  herbalRecommendations?: HerbalRecommendation[] | null;
  herbs?: HerbalRecommendation[] | null;
  dietLifestyle?: DietLifestyle | null;
}

interface EnrichedPatient {
  id?: string;
  name?: string;
  age?: string | number | null;
  gender?: string | null;
  city?: string | null;
  chiefComplaint?: string | null;
  lifestyle?: string | null;
  stressLevel?: number | null;
  historyNotes?: string | null;
}

interface DoctorNotes {
  prescribedBy?: string;
  followUpDate?: string;
  treatmentPlan?: string;
  clinicalObservations?: string;
}

interface PrintReportProps {
  diagnosis: DiagnosisData | null;
  enrichedPatient: EnrichedPatient | null;
  doctorNotes: DoctorNotes | null;
}

const pageStyle: CSSProperties = {
  background: "#ffffff",
  color: "#000000",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: "12px",
  lineHeight: 1.35,
  padding: "24px",
  width: "794px", // ~A4 width at 96dpi (html2canvas baseline)
};

const h1Style: CSSProperties = { margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700 };
const h2Style: CSSProperties = { margin: "14px 0 6px 0", fontSize: "12px", fontWeight: 700 };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse" };
const thTdStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "6px 8px",
  verticalAlign: "top",
};

export default function PrintReport({
  diagnosis,
  enrichedPatient,
  doctorNotes,
}: PrintReportProps) {
  const data = diagnosis;
  const dominantDosha = useMemo(
    () => (data?.prakriti ? getDominantDosha(data.prakriti) : null),
    [data],
  );

  const obsLines = (doctorNotes?.clinicalObservations || "")
    .split(/\r?\n|;|•/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const patientName = enrichedPatient?.name || data?.patient?.name || "—";
  const age = enrichedPatient?.age ?? data?.patient?.age;
  const gender = enrichedPatient?.gender || data?.patient?.gender || "—";
  const patientId = enrichedPatient?.id || data?.patient?.id || "—";
  const reportDate = data?.createdAt ? formatReportDate(data.createdAt) : "—";

  const prakriti = data?.prakriti || null;
  const doshaImbalance = data?.doshaImbalance || null;
  const diseasePredictions = data?.diseasePredictions || [];
  const herbalRecommendations = data?.herbalRecommendations || data?.herbs || [];
  const dietLifestyle = data?.dietLifestyle || null;

  const recommended = dietLifestyle?.recommended || [];
  const avoid = dietLifestyle?.avoid || [];
  const lifestyle = dietLifestyle?.lifestyle || [];
  const dailyRoutine = dietLifestyle?.dailyRoutine || [];

  const maxDietRows = Math.max(recommended.length, avoid.length, 3);
  const maxLifeRows = Math.max(lifestyle.length, dailyRoutine.length, 3);

  return (
    <div style={pageStyle}>
      <div>
        <div style={h1Style}>AYURVISION AI – CLINICAL REPORT</div>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thTdStyle}>
                <b>Patient Name</b>
                <br />
                {patientName}
              </td>
              <td style={thTdStyle}>
                <b>Age</b>
                <br />
                {age != null ? `${age}` : "—"}
              </td>
              <td style={thTdStyle}>
                <b>Gender</b>
                <br />
                {gender}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle}>
                <b>Patient ID</b>
                <br />
                {patientId}
              </td>
              <td style={thTdStyle}>
                <b>Report Date</b>
                <br />
                {reportDate}
              </td>
              <td style={thTdStyle}>
                <b>Report ID</b>
                <br />
                {data?.id || "—"}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle} colSpan={2}>
                <b>Prakriti</b>
                <br />
                {prakriti
                  ? `Vata ${prakriti.vata ?? 0}% | Pitta ${prakriti.pitta ?? 0}% | Kapha ${prakriti.kapha ?? 0}%`
                  : "—"}
              </td>
              <td style={thTdStyle}>
                <b>Dominant Dosha</b>
                <br />
                {dominantDosha || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={h2Style}>PATIENT SUMMARY</div>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thTdStyle}>
                <b>City</b>
                <br />
                {enrichedPatient?.city || data?.patient?.city || "—"}
              </td>
              <td style={thTdStyle}>
                <b>Chief Complaint</b>
                <br />
                {enrichedPatient?.chiefComplaint ||
                  data?.patient?.chiefComplaint ||
                  "—"}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle}>
                <b>Lifestyle</b>
                <br />
                {enrichedPatient?.lifestyle || data?.patient?.lifestyle || "—"}
              </td>
              <td style={thTdStyle}>
                <b>Stress Level</b>
                <br />
                {(enrichedPatient?.stressLevel ?? data?.patient?.stressLevel) !=
                null
                  ? `${enrichedPatient?.stressLevel ?? data?.patient?.stressLevel}/10`
                  : "—"}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle} colSpan={2}>
                <b>History Notes</b>
                <br />
                {enrichedPatient?.historyNotes ||
                  data?.patient?.historyNotes ||
                  "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={h2Style}>DOSHA PROFILE</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>Dosha</th>
              <th style={thTdStyle}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={thTdStyle}>Vata</td>
              <td style={thTdStyle}>{prakriti?.vata ?? "—"}%</td>
            </tr>
            <tr>
              <td style={thTdStyle}>Pitta</td>
              <td style={thTdStyle}>{prakriti?.pitta ?? "—"}%</td>
            </tr>
            <tr>
              <td style={thTdStyle}>Kapha</td>
              <td style={thTdStyle}>{prakriti?.kapha ?? "—"}%</td>
            </tr>
          </tbody>
        </table>

        {doshaImbalance ? (
          <>
            <div style={h2Style}>DOSHA IMBALANCE</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>Dosha</th>
                  <th style={thTdStyle}>Level</th>
                  <th style={thTdStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(doshaImbalance).map(([k, v]) => (
                  <tr key={k}>
                    <td style={thTdStyle}>{v.label || k}</td>
                    <td style={thTdStyle}>
                      {v.level != null ? `${v.level}%` : "—"}
                    </td>
                    <td style={thTdStyle}>{v.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <div style={h2Style}>PREDICTED CONDITIONS</div>
        {diseasePredictions?.length ? (
          <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
            {diseasePredictions.map((d, i) => {
              const pct = ((d.probability || 0) * 100).toFixed(0);
              const oneSentence = (d.explanation || "").split(".")[0]?.trim();
              return (
                <li key={`${d.condition}-${i}`} style={{ marginBottom: "4px" }}>
                  <b>{d.condition}</b> – {pct}%
                  {oneSentence ? ` — ${oneSentence}.` : ""}
                </li>
              );
            })}
          </ol>
        ) : (
          <div>No predicted conditions available.</div>
        )}

        <div style={h2Style}>PHYSICIAN OBSERVATIONS</div>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thTdStyle}>
                <b>Prescribed By</b>
                <br />
                {doctorNotes?.prescribedBy || "—"}
              </td>
              <td style={thTdStyle}>
                <b>Follow-up Date</b>
                <br />
                {doctorNotes?.followUpDate || "—"}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle} colSpan={2}>
                <b>Symptoms Observed</b>
                <br />
                {obsLines.length ? (
                  <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                    {obsLines.slice(0, 10).map((x, idx) => (
                      <li key={`${x}-${idx}`}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </td>
            </tr>
            <tr>
              <td style={thTdStyle} colSpan={2}>
                <b>Treatment Direction</b>
                <br />
                {doctorNotes?.treatmentPlan || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={h2Style}>HERBAL RECOMMENDATIONS</div>
        {herbalRecommendations?.length ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Herb</th>
                <th style={thTdStyle}>Botanical Name</th>
                <th style={thTdStyle}>Dosha Effect</th>
                <th style={thTdStyle}>Preparation</th>
                <th style={thTdStyle}>Caution</th>
              </tr>
            </thead>
            <tbody>
              {herbalRecommendations.map((h) => (
                <tr key={h.id ?? `${h.plantName}-${h.botanicalName}`}>
                  <td style={thTdStyle}>{h.plantName || "—"}</td>
                  <td style={thTdStyle}>{h.botanicalName || "—"}</td>
                  <td style={thTdStyle}>{h.doshaEffect || "—"}</td>
                  <td style={thTdStyle}>{h.preparation || "—"}</td>
                  <td style={thTdStyle}>
                    {h.cautions?.length ? h.cautions.join("; ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No herbal recommendations available.</div>
        )}

        <div style={h2Style}>DIETARY GUIDELINES</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>Recommended</th>
              <th style={thTdStyle}>Avoid</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxDietRows }).map((_, idx) => (
              <tr key={idx}>
                <td style={thTdStyle}>{recommended[idx] || ""}</td>
                <td style={thTdStyle}>{avoid[idx] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={h2Style}>LIFESTYLE AND ROUTINE</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thTdStyle}>Lifestyle Advice</th>
              <th style={thTdStyle}>Daily Routine</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxLifeRows }).map((_, idx) => (
              <tr key={idx}>
                <td style={thTdStyle}>{lifestyle[idx] || ""}</td>
                <td style={thTdStyle}>{dailyRoutine[idx] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "14px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
          <div>
            <b>Prepared by:</b> AyurVision AI Clinical System
          </div>
          <div>This report supports clinical decision making only.</div>
          <div>
            Final diagnosis must be confirmed by a qualified Ayurvedic practitioner.
          </div>
          <div style={{ marginTop: "10px" }}>
            Doctor Signature: ______________________
          </div>
        </div>
      </div>
    </div>
  );
}

