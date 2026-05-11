import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1000).max(65535).default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().url().default("http://localhost:5000"),
  RAG_API_URL: z.string().url().default("http://127.0.0.1:8000"),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((s) =>
      (s?.trim() ? s.split(",") : ["http://localhost:5173", "http://127.0.0.1:5173"]).map((x) =>
        x.trim()
      )
    ),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export const env = envSchema.parse({
  ...process.env,
  PORT: process.env.PORT ?? "3001",
});
