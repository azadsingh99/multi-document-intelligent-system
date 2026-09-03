import { randomUUID } from "node:crypto";
import { createAIProvider } from "../ai/index.js";
import { pool } from "../db/pool.js";
import type { AnalysisOutput, AnalysisRecord, DocumentInput } from "../types/index.js";
import { getDocumentsByIds } from "./documentService.js";

const provider = createAIProvider();

function mapOutput(row: {
  summary: string;
  key_facts: AnalysisOutput["keyFacts"];
  discrepancies: AnalysisOutput["discrepancies"];
  missing_information: AnalysisOutput["missingInformation"];
}): AnalysisOutput {
  return {
    summary: row.summary,
    keyFacts: row.key_facts,
    discrepancies: row.discrepancies,
    missingInformation: row.missing_information,
  };
}

export async function runAnalysis(
  prompt: string,
  documentIds: string[],
): Promise<AnalysisRecord> {
  const uniqueIds = [...new Set(documentIds)];
  const documents = await getDocumentsByIds(uniqueIds);

  if (documents.length !== uniqueIds.length) {
    const found = new Set(documents.map((doc) => doc.id));
    const missing = uniqueIds.filter((id) => !found.has(id));
    throw Object.assign(new Error(`Unknown document id(s): ${missing.join(", ")}`), {
      statusCode: 400,
    });
  }

  const analysisId = randomUUID();
  await pool.query(
    `INSERT INTO analyses (id, prompt, status) VALUES ($1, $2, 'pending')`,
    [analysisId, prompt],
  );

  for (const documentId of uniqueIds) {
    await pool.query(
      `INSERT INTO analysis_documents (analysis_id, document_id) VALUES ($1, $2)`,
      [analysisId, documentId],
    );
  }

  const inputs: DocumentInput[] = documents.map((doc) => ({
    id: doc.id,
    name: doc.originalName,
    text: doc.extractedText,
  }));

  try {
    const result = await provider.analyze(prompt, inputs);
    const resultId = randomUUID();

    await pool.query(
      `INSERT INTO analysis_results
        (id, analysis_id, summary, key_facts, discrepancies, missing_information)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
      [
        resultId,
        analysisId,
        result.summary,
        JSON.stringify(result.keyFacts),
        JSON.stringify(result.discrepancies),
        JSON.stringify(result.missingInformation),
      ],
    );
    await pool.query(`UPDATE analyses SET status = 'completed' WHERE id = $1`, [analysisId]);

    return {
      id: analysisId,
      prompt,
      status: "completed",
      createdAt: new Date().toISOString(),
      documentIds: uniqueIds,
      result,
      errorMessage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    await pool.query(
      `UPDATE analyses SET status = 'failed', error_message = $2 WHERE id = $1`,
      [analysisId, message],
    );
    throw error;
  }
}

export async function getAnalysis(id: string): Promise<AnalysisRecord | null> {
  const analysis = await pool.query("SELECT * FROM analyses WHERE id = $1", [id]);
  if (!analysis.rowCount) return null;

  const docs = await pool.query(
    "SELECT document_id FROM analysis_documents WHERE analysis_id = $1",
    [id],
  );
  const result = await pool.query(
    "SELECT * FROM analysis_results WHERE analysis_id = $1",
    [id],
  );
  const row = analysis.rows[0];

  return {
    id: row.id,
    prompt: row.prompt,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    documentIds: docs.rows.map((item: { document_id: string }) => item.document_id),
    result: result.rowCount ? mapOutput(result.rows[0]) : null,
    errorMessage: row.error_message,
  };
}
