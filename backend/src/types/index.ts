export interface SourceRef {
  documentId: string;
  documentName: string;
}

export interface SourcedFinding {
  id: string;
  text: string;
  source: SourceRef;
}

export interface DiscrepancyValue {
  value: string;
  source: SourceRef;
}

export interface Discrepancy {
  id: string;
  field: string;
  description: string;
  values: DiscrepancyValue[];
}

export interface AnalysisOutput {
  summary: string;
  keyFacts: SourcedFinding[];
  discrepancies: Discrepancy[];
  missingInformation: SourcedFinding[];
}

export interface DocumentInput {
  id: string;
  name: string;
  text: string;
}

export interface StoredDocument {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
  createdAt: string;
}

export interface AnalysisRecord {
  id: string;
  prompt: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  documentIds: string[];
  result: AnalysisOutput | null;
  errorMessage: string | null;
}
