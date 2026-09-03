import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { env, maxFileSizeBytes } from "../config/env.js";

export const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".txt"] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/csv",
  "application/octet-stream",
] as const;

export class FileValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "FileValidationError";
  }
}

export function secureStoredName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const base = originalName
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .slice(0, -(ext.length || 0))
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80)
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  const safeBase = base || "document";
  return `${Date.now()}-${randomUUID()}-${safeBase}${ext}`;
}

export function detectKind(originalName: string, buffer: Buffer): "pdf" | "csv" | "txt" {
  const ext = extname(originalName).toLowerCase();
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new FileValidationError(
      `Unsupported file type "${ext || originalName}". Allowed: PDF, CSV, TXT.`,
    );
  }

  if (buffer.length === 0) {
    throw new FileValidationError(`"${originalName}" is empty.`);
  }

  if (buffer.length > maxFileSizeBytes()) {
    throw new FileValidationError(
      `"${originalName}" exceeds the ${env.maxFileSizeMb}MB size limit.`,
      413,
    );
  }

  if (ext === ".pdf") {
    const header = buffer.subarray(0, 5).toString("utf8");
    if (header !== "%PDF-") {
      throw new FileValidationError(
        `"${originalName}" is not a valid PDF (missing %PDF- header).`,
      );
    }
    return "pdf";
  }

  if (buffer.includes(0)) {
    throw new FileValidationError(
      `"${originalName}" looks binary and is not a valid ${ext.toUpperCase().slice(1)} file.`,
    );
  }

  return ext === ".csv" ? "csv" : "txt";
}

export function validateUploadBatch(files: Array<{ originalname: string; size: number }>): void {
  if (!files.length) {
    throw new FileValidationError("Upload at least one PDF, CSV, or TXT file.");
  }
  if (files.length > env.maxFilesPerUpload) {
    throw new FileValidationError(
      `Too many files. Maximum per request is ${env.maxFilesPerUpload}.`,
    );
  }
}
