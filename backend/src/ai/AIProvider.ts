import type { AnalysisOutput, DocumentInput } from "../types/index.js";

/**
 * Swap MockProvider for GrokProvider (or any vendor) without changing callers.
 * Implementations must ground every finding in a provided document and
 * attach that document's id and original name. Never invent facts.
 */
export interface AIProvider {
  readonly name: string;
  analyze(prompt: string, documents: DocumentInput[]): Promise<AnalysisOutput>;
}

export function assertGrounded(
  output: AnalysisOutput,
  documents: DocumentInput[],
): AnalysisOutput {
  const allowed = new Map(documents.map((doc) => [doc.id, doc.name]));

  const keepFinding = (finding: AnalysisOutput["keyFacts"][number]) =>
    allowed.has(finding.source.documentId);

  const keyFacts = output.keyFacts.filter(keepFinding);
  const missingInformation = output.missingInformation.filter(keepFinding);
  const discrepancies = output.discrepancies
    .map((item) => ({
      ...item,
      values: item.values.filter((value) => allowed.has(value.source.documentId)),
    }))
    .filter((item) => item.values.length > 0);

  return {
    summary: output.summary,
    keyFacts,
    discrepancies,
    missingInformation,
  };
}
