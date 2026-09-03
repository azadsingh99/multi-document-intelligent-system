import { Router } from "express";
import { z } from "zod";
import { getAnalysis, runAnalysis } from "../services/analysisService.js";

const createSchema = z.object({
  prompt: z.string().trim().max(4000).default(""),
  documentIds: z.array(z.string().uuid()).min(1, "Select at least one document."),
});

export const analysisRouter = Router();

analysisRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid analysis request.",
      });
      return;
    }
    const record = await runAnalysis(parsed.data.prompt, parsed.data.documentIds);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

analysisRouter.get("/:id", async (req, res, next) => {
  try {
    const record = await getAnalysis(req.params.id);
    if (!record) {
      res.status(404).json({ error: "Analysis not found." });
      return;
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
});
