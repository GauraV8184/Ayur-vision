/*
  REQUIRED SUPABASE MIGRATION — run in Supabase SQL editor:
  
  CREATE TABLE IF NOT EXISTS prakriti_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    patient_name TEXT,
    vata_pct NUMERIC(5,2),
    pitta_pct NUMERIC(5,2),
    kapha_pct NUMERIC(5,2),
    dominant_dosha TEXT,
    confidence NUMERIC(4,3),
    top_features JSONB,
    interpretation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  
  ALTER TABLE prakriti_results ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read own prakriti results" ON prakriti_results
    FOR SELECT USING (auth.uid() IS NOT NULL);
  CREATE POLICY "Users can insert prakriti results" ON prakriti_results
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
*/

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";

const router = express.Router();
const AI_SERVICE_URL = env.AI_SERVICE_URL;

router.post("/prakriti", authMiddleware, async (req, res) => {
  // 1. Extract answers object from req.body
  // 2. Validate that answers is a non-null object
  // 3. Also extract optional: patientId (string), patientName (string)
  // 4. Forward answers to Flask:
  //    POST ${AI_SERVICE_URL}/predict-prakriti
  //    Content-Type: application/json
  //    body: JSON.stringify(answers)
  // 5. If Flask returns non-ok: forward the error with 502
  // 6. Parse Flask JSON response as prakritiResult
  // 7. If patientId is provided, save to Supabase:
  //    Insert into table "prakriti_results" with columns:
  //      patient_id, patient_name, vata_pct, pitta_pct, kapha_pct,
  //      dominant_dosha, confidence, top_features (jsonb), interpretation,
  //      created_at (now())
  //    Use supabase.from("prakriti_results").insert({...})
  //    If Supabase insert fails, log warning but do NOT fail the request
  // 8. Return 200 with prakritiResult plus { saved: boolean }
  // 9. Wrap in try/catch, return 502 on network errors

  const { answers, patientId, patientName } = req.body as {
    answers?: unknown;
    patientId?: unknown;
    patientName?: unknown;
  };

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return res.status(400).json({
      error: "Invalid request body",
      message: "answers must be a JSON object.",
    });
  }

  const pid =
    typeof patientId === "string" && patientId.trim().length > 0
      ? patientId.trim()
      : null;
  const pname =
    typeof patientName === "string" && patientName.trim().length > 0
      ? patientName.trim()
      : null;

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict-prakriti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      let err: { error?: string } = {};
      try {
        err = raw ? (JSON.parse(raw) as { error?: string }) : {};
      } catch (_) {
        err = {};
      }
      return res.status(502).json({
        error: err.error || raw || "Prakriti service error",
        message: err.error || raw || "Prakriti service unavailable.",
      });
    }

    const prakritiResult = (await response.json()) as {
      vata_pct?: number;
      pitta_pct?: number;
      kapha_pct?: number;
      dominant_dosha?: string;
      confidence?: number;
      top_features?: unknown;
      interpretation?: string;
      [k: string]: unknown;
    };

    let saved = false;
    if (pid) {
      try {
        const { error } = await supabase.from("prakriti_results").insert({
          patient_id: pid,
          patient_name: pname,
          vata_pct: prakritiResult.vata_pct ?? null,
          pitta_pct: prakritiResult.pitta_pct ?? null,
          kapha_pct: prakritiResult.kapha_pct ?? null,
          dominant_dosha: prakritiResult.dominant_dosha ?? null,
          confidence: prakritiResult.confidence ?? null,
          top_features: prakritiResult.top_features ?? null,
          interpretation: prakritiResult.interpretation ?? null,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.warn("Supabase prakriti_results insert warning:", error.message);
        } else {
          saved = true;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("Supabase prakriti_results insert warning:", msg);
      }
    }

    return res.status(200).json({ ...prakritiResult, saved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Prakriti route error:", msg);
    return res.status(503).json({
      error: "AI service unavailable",
      message: "Could not reach the Flask AI service.",
    });
  }
});

export default router;

