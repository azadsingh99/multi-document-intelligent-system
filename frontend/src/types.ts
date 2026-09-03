export interface DocumentSummary {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  excerpt: string;
}

export interface SourceRef {
  documentId: string;
  documentName: string;
}

export interface SourcedFinding {
  id: string;
  text: string;
  source: SourceRef;
}

export interface Discrepancy {
  id: string;
  field: string;
  description: string;
  values: Array<{ value: string; source: SourceRef }>;
}

export interface AnalysisOutput {
  summary: string;
  keyFacts: SourcedFinding[];
  discrepancies: Discrepancy[];
  missingInformation: SourcedFinding[];
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
