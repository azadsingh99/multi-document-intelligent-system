import type { ErrorRequestHandler, RequestHandler } from "express";
import { FileValidationError } from "../services/fileValidation.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found." });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof FileValidationError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "A file exceeds the configured size limit." });
    return;
  }

  if (err?.code === "LIMIT_FILE_COUNT") {
    res.status(400).json({ error: "Too many files in this upload." });
    return;
  }

  const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
  const message =
    status < 500 && err instanceof Error ? err.message : "Unexpected server error.";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
};
