import { describe, expect, it } from "vitest";

import { env } from "../config/env";

describe("config/env", () => {
  it("parses required URLs", () => {
    expect(env.VITE_AI_SERVICE_URL).toMatch(/^https?:\/\//);
    expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//);
  });
});
