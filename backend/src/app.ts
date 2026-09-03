import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/security.js";
import { analysisRouter } from "./routes/analysis.js";
import { documentsRouter } from "./routes/documents.js";
import { pool } from "./db/pool.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({
        ok: true,
        provider: env.aiProvider,
        database: "up",
      });
    } catch {
      res.status(503).json({
        ok: false,
        provider: env.aiProvider,
        database: "down",
      });
    }
  });

  app.use("/api/documents", documentsRouter);
  app.use("/api/analyses", analysisRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
