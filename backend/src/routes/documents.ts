import { Router } from "express";
import multer from "multer";
import { env, maxFileSizeBytes } from "../config/env.js";
import { listDocuments, storeUploadedFiles } from "../services/documentService.js";
import { validateUploadBatch } from "../services/fileValidation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes(),
    files: env.maxFilesPerUpload,
  },
});

export const documentsRouter = Router();

documentsRouter.get("/", async (_req, res, next) => {
  try {
    const documents = await listDocuments();
    res.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
        excerpt: doc.extractedText.slice(0, 240),
      })),
    });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", upload.array("files"), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    validateUploadBatch(files);
    const documents = await storeUploadedFiles(files, env.uploadDir);
    res.status(201).json({
      documents: documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
        excerpt: doc.extractedText.slice(0, 240),
      })),
    });
  } catch (error) {
    next(error);
  }
});
