import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../db/pool.js";
import type { StoredDocument } from "../types/index.js";
import { extractText } from "./extractionService.js";
import { detectKind, secureStoredName } from "./fileValidation.js";

function mapRow(row: {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string;
  created_at: Date;
}): StoredDocument {
  return {
    id: row.id,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    extractedText: row.extracted_text,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function storeUploadedFiles(
  files: Express.Multer.File[],
  uploadDir: string,
): Promise<StoredDocument[]> {
  await mkdir(uploadDir, { recursive: true });
  const stored: StoredDocument[] = [];

  for (const file of files) {
    const kind = detectKind(file.originalname, file.buffer);
    const extractedText = await extractText(kind, file.buffer, file.originalname);
    const storedName = secureStoredName(file.originalname);
    const diskPath = resolve(uploadDir, storedName);
    await writeFile(diskPath, file.buffer);

    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO documents
        (id, original_name, stored_name, mime_type, size_bytes, extracted_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        file.originalname.replace(/\\/g, "/").split("/").pop(),
        storedName,
        file.mimetype || "application/octet-stream",
        file.size,
        extractedText,
      ],
    );
    stored.push(mapRow(result.rows[0]));
  }

  return stored;
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const result = await pool.query(
    "SELECT * FROM documents ORDER BY created_at DESC",
  );
  return result.rows.map(mapRow);
}

export async function getDocumentsByIds(ids: string[]): Promise<StoredDocument[]> {
  if (ids.length === 0) return [];
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = ANY($1::uuid[])",
    [ids],
  );
  return result.rows.map(mapRow);
}
