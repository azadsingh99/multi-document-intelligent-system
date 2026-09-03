import { pool } from "./pool.js";

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      extracted_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id UUID PRIMARY KEY,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analysis_documents (
      analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      PRIMARY KEY (analysis_id, document_id)
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id UUID PRIMARY KEY,
      analysis_id UUID NOT NULL UNIQUE REFERENCES analyses(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      key_facts JSONB NOT NULL,
      discrepancies JSONB NOT NULL,
      missing_information JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
