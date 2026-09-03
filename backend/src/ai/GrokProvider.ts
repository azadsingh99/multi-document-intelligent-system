import { env } from "../config/env.js";
import { assertGrounded, type AIProvider } from "./AIProvider.js";
import type { AnalysisOutput, DocumentInput } from "../types/index.js";

const SYSTEM_PROMPT = `You are a banking document analyst.
You receive multiple documents. Each document is wrapped in a boundary tag with its id and filename.
Rules:
- Use only facts that appear in the provided documents.
- Never invent names, account numbers, amounts, dates, employers, or other facts.
- Every key fact, discrepancy value, and missing-information item MUST include source.documentId and source.documentName from the supplied documents.
- Preserve document boundaries: if two documents disagree, report a discrepancy citing both sources.
- If a field is absent from a document that should contain it, report missing information citing that document.
- Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "keyFacts": [{"id": "string", "text": "string", "source": {"documentId": "string", "documentName": "string"}}],
  "discrepancies": [{"id": "string", "field": "string", "description": "string", "values": [{"value": "string", "source": {"documentId": "string", "documentName": "string"}}]}],
  "missingInformation": [{"id": "string", "text": "string", "source": {"documentId": "string", "documentName": "string"}}]
}`;

function boundedDocuments(documents: DocumentInput[]): string {
  return documents
    .map(
      (doc) =>
        `<document id="${doc.id}" name="${doc.name}">\n${doc.text}\n</document>`,
    )
    .join("\n\n");
}

function parseOutput(raw: string): AnalysisOutput {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Grok returned an unparseable response.");
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as AnalysisOutput;
  if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.keyFacts)) {
    throw new Error("Grok response did not match the analysis schema.");
  }

  return {
    summary: parsed.summary,
    keyFacts: parsed.keyFacts ?? [],
    discrepancies: parsed.discrepancies ?? [],
    missingInformation: parsed.missingInformation ?? [],
  };
}

export class GrokProvider implements AIProvider {
  readonly name = "grok";

  async analyze(prompt: string, documents: DocumentInput[]): Promise<AnalysisOutput> {
    if (!env.grokApiKey) {
      throw new Error(
        "GROK_API_KEY is not set. Add it to .env and restart, or set AI_PROVIDER=mock.",
      );
    }
    if (documents.length === 0) {
      throw new Error("At least one document is required for analysis.");
    }

    const userPrompt = [
      `Reviewer prompt:\n${prompt.trim() || "Perform a collective banking-file review."}`,
      "",
      "Documents:",
      boundedDocuments(documents),
    ].join("\n");

    const response = await fetch(`${env.grokBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.grokApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.grokModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Grok API error (${response.status}): ${detail.slice(0, 400)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Grok API returned an empty completion.");
    }

    return assertGrounded(parseOutput(content), documents);
  }
}
