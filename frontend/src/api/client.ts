import type { AnalysisRecord, DocumentSummary } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function uploadDocuments(files: File[]): Promise<DocumentSummary[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { documents: DocumentSummary[] };
  return body.documents;
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE}/api/documents`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = (await response.json()) as { documents: DocumentSummary[] };
  return body.documents;
}

export async function createAnalysis(
  prompt: string,
  documentIds: string[],
): Promise<AnalysisRecord> {
  const response = await fetch(`${API_BASE}/api/analyses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, documentIds }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AnalysisRecord;
}

export function formatAnalysisCopy(record: AnalysisRecord): string {
  const result = record.result;
  if (!result) return "";

  const lines = [
    "MDIS analysis",
    `Prompt: ${record.prompt || "(none)"}`,
    "",
    "Summary",
    result.summary,
    "",
    "Key facts",
    ...result.keyFacts.map(
      (item) => `- ${item.text} [${item.source.documentName} / ${item.source.documentId}]`,
    ),
    "",
    "Discrepancies",
    ...result.discrepancies.flatMap((item) => [
      `- ${item.field}: ${item.description}`,
      ...item.values.map(
        (value) => `    ${value.value} — ${value.source.documentName} / ${value.source.documentId}`,
      ),
    ]),
    "",
    "Missing information",
    ...result.missingInformation.map(
      (item) => `- ${item.text} [${item.source.documentName} / ${item.source.documentId}]`,
    ),
  ];

  return lines.join("\n");
}
