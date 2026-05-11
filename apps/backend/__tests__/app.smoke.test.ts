import request from "supertest";

import { createApp } from "../src/app.js";

describe("createApp", () => {
  it("responds on GET /", async () => {
    const app = createApp();
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/AyurVision/);
  });
});
