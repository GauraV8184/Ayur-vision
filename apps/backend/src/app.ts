import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import knowledgeRoutes from "./routes/knowledge.js";
import prakritiRoutes from "./routes/prakriti.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    })
  );

  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api", uploadRoutes);
  app.use("/api", knowledgeRoutes);
  app.use("/api", prakritiRoutes);

  app.get("/", (_req, res) => {
    res.json({ message: "AyurVision AI backend is running" });
  });

  return app;
}
