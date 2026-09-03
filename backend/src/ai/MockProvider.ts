import { createHash, randomUUID } from "node:crypto";
import type { AIProvider } from "./AIProvider.js";
import type {
  AnalysisOutput,
  Discrepancy,
  DocumentInput,
  SourcedFinding,
  SourceRef,
} from "../types/index.js";

interface ExtractedField {
  field: string;
  value: string;
  normalized: string;
  source: SourceRef;
  line: string;
}

const FIELD_PATTERNS: Array<{ field: string; pattern: RegExp }> = [
  {
    field: "customer_name",
    pattern:
      /(?:customer\s*name|full\s*legal\s*name|applicant(?:_name)?|employee\s*name|requestor_name|prepared\s*for|^name)\s*[:|,]\s*(.+)$/i,
  },
  {
    field: "account_number",
    pattern:
      /(?:account\s*number(?:\s*on\s*file)?|account_number|source_account|alternate_account_mentioned)\s*[:|,]\s*([0-9]{6,})/i,
  },
  {
    field: "annual_income",
    pattern:
      /(?:annual(?:\s*base)?\s*salary|stated_annual_income|annual\s*income(?:\s*declared)?|stated\s*income(?:\s*on\s*the\s*application)?)\s*[:|,]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  },
  {
    field: "address",
    pattern:
      /(?:residential\s*address|address\s*on\s*file|residence\s*listed\s*on\s*the\s*statement\s*is|address)\s*[:|,]?\s*(.+)$/i,
  },
  {
    field: "employer",
    pattern: /(?:employer|employment)\s*[:|,]\s*(.+)$/i,
  },
  {
    field: "tax_id",
    pattern:
      /(?:tax\s*identification\s*number|tax_id|tin|ssn)\s*[:|,]\s*(.+)$/i,
  },
  {
    field: "requested_amount",
    pattern:
      /(?:requested_amount|requested\s*amount|personal\s*loan\s*of|loan\s*of)\s*[:|,]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  },
  {
    field: "closing_balance",
    pattern: /(?:closing\s*balance)\s*[:|,]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  },
  {
    field: "date_of_birth",
    pattern: /(?:date\s*of\s*birth|dob)\s*[:|,]\s*(.+)$/i,
  },
  {
    field: "beneficiary",
    pattern: /(?:beneficiary_name|beneficiary)\s*[:|,]\s*(.+)$/i,
  },
];

const EMPTY_VALUES = new Set([
  "",
  "-",
  "n/a",
  "na",
  "none",
  "null",
  "not provided",
  "not on file",
  "missing",
  "unknown",
]);

function sourceOf(doc: DocumentInput): SourceRef {
  return { documentId: doc.id, documentName: doc.name };
}

function normalize(field: string, value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (field === "account_number") {
    return trimmed.replace(/\D/g, "");
  }
  if (field === "annual_income" || field === "requested_amount" || field === "closing_balance") {
    return trimmed.replace(/[$,]/g, "");
  }
  if (field === "address") {
    return trimmed.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
  }
  return trimmed.toLowerCase();
}

function isEmpty(value: string): boolean {
  return EMPTY_VALUES.has(value.trim().toLowerCase());
}

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractFields(documents: DocumentInput[]): ExtractedField[] {
  const fields: ExtractedField[] = [];

  for (const doc of documents) {
    for (const line of linesOf(doc.text)) {
      const csv = line.match(/^([a-zA-Z][a-zA-Z0-9_ ]*),\s*(.+)$/);
      const candidates: Array<{ field: string; value: string }> = [];

      if (csv) {
        const rawField = csv[1].trim().toLowerCase().replace(/\s+/g, "_");
        const mapped =
          FIELD_PATTERNS.find((item) => item.field === rawField)?.field ??
          (rawField === "applicant_name" || rawField === "requestor_name"
            ? "customer_name"
            : rawField === "stated_annual_income"
              ? "annual_income"
              : rawField === "beneficiary_name"
                ? "beneficiary"
                : rawField);
        candidates.push({ field: mapped, value: csv[2].trim() });
      }

      for (const { field, pattern } of FIELD_PATTERNS) {
        const match = line.match(pattern);
        if (match?.[1]) {
          candidates.push({ field, value: match[1].trim() });
        }
      }

      for (const candidate of candidates) {
        if (isEmpty(candidate.value)) continue;
        fields.push({
          field: candidate.field,
          value: candidate.value.replace(/[.,;]+$/, ""),
          normalized: normalize(candidate.field, candidate.value),
          source: sourceOf(doc),
          line,
        });
      }
    }
  }

  const seen = new Set<string>();
  return fields.filter((item) => {
    const key = `${item.field}|${item.normalized}|${item.source.documentId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finding(text: string, source: SourceRef): SourcedFinding {
  return { id: randomUUID(), text, source };
}

function label(field: string): string {
  return field.replace(/_/g, " ");
}

function buildKeyFacts(fields: ExtractedField[]): SourcedFinding[] {
  const priority = [
    "customer_name",
    "account_number",
    "annual_income",
    "address",
    "employer",
    "requested_amount",
    "closing_balance",
    "tax_id",
    "date_of_birth",
    "beneficiary",
  ];

  return fields
    .filter((item) => priority.includes(item.field))
    .map((item) =>
      finding(
        `${label(item.field)} is "${item.value}" in ${item.source.documentName}.`,
        item.source,
      ),
    );
}

function buildDiscrepancies(fields: ExtractedField[]): Discrepancy[] {
  const comparable = [
    "customer_name",
    "account_number",
    "annual_income",
    "address",
    "employer",
    "tax_id",
    "requested_amount",
  ];

  const discrepancies: Discrepancy[] = [];

  for (const field of comparable) {
    const group = fields.filter((item) => item.field === field);
    const unique = [...new Set(group.map((item) => item.normalized))];
    if (unique.length < 2) continue;

    const values = unique.map((normalized) => {
      const match = group.find((item) => item.normalized === normalized)!;
      return { value: match.value, source: match.source };
    });

    discrepancies.push({
      id: randomUUID(),
      field: label(field),
      description: `${label(field)} does not match across the uploaded documents.`,
      values,
    });
  }

  return discrepancies;
}

function buildMissing(documents: DocumentInput[], fields: ExtractedField[]): SourcedFinding[] {
  const missing: SourcedFinding[] = [];
  const present = (field: string, documentId: string) =>
    fields.some((item) => item.field === field && item.source.documentId === documentId);

  const expectations: Array<{ hint: RegExp; field: string; label: string }> = [
    { hint: /kyc|profile/i, field: "tax_id", label: "tax identification number" },
    { hint: /kyc|profile|application/i, field: "employer", label: "employer / employment details" },
    { hint: /application/i, field: "tax_id", label: "tax identification number" },
    { hint: /employment|verification/i, field: "tax_id", label: "tax identification number" },
    { hint: /statement/i, field: "account_number", label: "account number" },
  ];

  for (const doc of documents) {
    const blob = `${doc.name}\n${doc.text}`;
    for (const rule of expectations) {
      if (!rule.hint.test(blob)) continue;
      if (present(rule.field, doc.id)) continue;
      if (new RegExp(rule.field === "tax_id" ? /tax identification|tax_id/i : /employer|employment/i).test(doc.text) || rule.field === "account_number") {
        missing.push(
          finding(
            `${doc.name} does not contain a usable ${rule.label}.`,
            sourceOf(doc),
          ),
        );
      }
    }
  }

  const corpusHas = (field: string) => fields.some((item) => item.field === field);
  if (!corpusHas("tax_id") && documents[0]) {
    const already = missing.some((item) => /tax identification/i.test(item.text));
    if (!already) {
      missing.push(
        finding(
          `${documents[0].name} was reviewed and no tax identification number appears in the corpus.`,
          sourceOf(documents[0]),
        ),
      );
    }
  }

  const seen = new Set<string>();
  return missing.filter((item) => {
    const key = `${item.source.documentId}|${item.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSummary(
  prompt: string,
  documents: DocumentInput[],
  discrepancies: Discrepancy[],
  missing: SourcedFinding[],
): string {
  const names = documents.map((doc) => doc.name).join(", ");
  const promptNote = prompt.trim()
    ? `Reviewer prompt: "${prompt.trim()}".`
    : "No additional reviewer prompt was supplied.";

  return [
    `Analyzed ${documents.length} document${documents.length === 1 ? "" : "s"} (${names}) while keeping each source boundary intact.`,
    promptNote,
    `Grounded extraction produced ${discrepancies.length} cross-document ${discrepancies.length === 1 ? "discrepancy" : "discrepancies"} and ${missing.length} missing-information item${missing.length === 1 ? "" : "s"}.`,
    "Every finding below is taken from an uploaded document; no external facts were added.",
  ].join(" ");
}

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async analyze(prompt: string, documents: DocumentInput[]): Promise<AnalysisOutput> {
    if (documents.length === 0) {
      throw new Error("At least one document is required for analysis.");
    }

    const fields = extractFields(documents);
    const keyFacts = buildKeyFacts(fields);
    const discrepancies = buildDiscrepancies(fields);
    const missingInformation = buildMissing(documents, fields);
    const summary = buildSummary(prompt, documents, discrepancies, missingInformation);

    return { summary, keyFacts, discrepancies, missingInformation };
  }
}

/** Stable fingerprint so tests can assert determinism. */
export function fingerprintOutput(output: AnalysisOutput): string {
  const payload = {
    summary: output.summary,
    facts: output.keyFacts.map((item) => [item.text, item.source.documentId]),
    gaps: output.missingInformation.map((item) => [item.text, item.source.documentId]),
    diffs: output.discrepancies.map((item) => [
      item.field,
      item.description,
      item.values.map((value) => [value.value, value.source.documentId]),
    ]),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
