import express from "express";
import type { Request, Response } from "express";
import multer from "multer";
import type { FileFilterCallback } from "multer";
import path from "path";

import authMiddleware from "../middleware/authMiddleware.js";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";

const router = express.Router();
const AI_SERVICE_URL = env.AI_SERVICE_URL;

const BUCKET = "plant-images";

// Memory storage so we can upload buffer to Supabase without writing to disk
const storage = multer.memoryStorage();
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};
const upload = multer({ storage, fileFilter });

/**
 * Call Flask AI service to classify the plant leaf image.
 * @param {Buffer} buffer - Image file buffer
 * @param {string} filename - Original filename for Content-Disposition
 * @param {string} mime - MIME type
 * @returns {Promise<{ plant: string, confidence: number }>}
 */
async function predictPlantFromImage(
  buffer: Buffer,
  filename: string,
  mime: string
) {
  const formData = new FormData();
  const bytes = new Uint8Array(buffer);
  formData.append("image", new Blob([bytes], { type: mime }), filename);

  const response = await fetch(`${AI_SERVICE_URL}/predict-plant`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    let errMessage = "AI service error";
    try {
      const j = JSON.parse(errBody);
      if (j.error) errMessage = j.error;
    } catch (_) {
      if (errBody) errMessage = errBody;
    }
    throw new Error(errMessage);
  }

  const data = await response.json();
  return {
    plant: data.plant,
    confidence: data.confidence,
    tta_steps: data.tta_steps ?? null,
  };
}

// POST /api/upload (protected)
// Upload image to Supabase storage → call AI → save prediction to Supabase
router.post(
  "/upload",
  authMiddleware,
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const safeName = path.basename(req.file.originalname, path.extname(req.file.originalname)).replace(/\s+/g, "_");
    const storagePath = `${userId}/${safeName}-${Date.now()}${ext}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        return res.status(502).json({
          message: "Failed to upload image to storage",
          error: uploadError.message,
        });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      const imageUrl = publicUrl;

      const prediction = await predictPlantFromImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const { data: row, error: insertError } = await supabase
        .from("plant_predictions")
        .insert({
          user_id: userId,
          image_url: imageUrl,
          plant: prediction.plant,
          confidence: prediction.confidence,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Supabase plant_predictions insert error:", insertError);
        return res.status(201).json({
          message: "Image uploaded and classified; prediction not saved",
          imageUrl,
          plant: prediction.plant,
          confidence: prediction.confidence,
          ttaSteps: prediction.tta_steps ?? null,
        });
      }

      return res.status(201).json({
        message: "Image uploaded successfully",
        imageUrl,
        plant: prediction.plant,
        confidence: prediction.confidence,
        ttaSteps: prediction.tta_steps ?? null,
        predictionId: row?.id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Upload/prediction error:", msg);
      return res.status(502).json({
        message: "Image uploaded but AI service failed",
        error: msg,
      });
    }
  }
);

export default router;
