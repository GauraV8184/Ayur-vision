import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.union([z.literal(""), z.string().url()]),
  VITE_AI_SERVICE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_ENABLE_MOCK_MODE: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export const env = envSchema.parse({
  VITE_API_URL: (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "",
  VITE_AI_SERVICE_URL:
    import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:5000",
  VITE_SUPABASE_URL:
    import.meta.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY:
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    "replace-with-real-anon-key-20+",
  VITE_ENABLE_MOCK_MODE: import.meta.env.VITE_ENABLE_MOCK_MODE,
});
