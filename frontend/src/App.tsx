import { useEffect, useMemo, useState } from "react";
import {
  createAnalysis,
  fetchDocuments,
  formatAnalysisCopy,
  uploadDocuments,
} from "./api/client";
import { DocumentList } from "./components/DocumentList";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { Uploader } from "./components/Uploader";
import type { AnalysisRecord, DocumentSummary } from "./types";

export default function App() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(
    "Review this lending file for identity, income, and account inconsistencies. Flag anything missing for KYC or credit approval.",
  );
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [busyUpload, setBusyUpload] = useState(false);
  const [busyAnalyze, setBusyAnalyze] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void fetchDocuments()
      .then((items) => {
        setDocuments(items);
        setSelectedIds(items.map((item) => item.id));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleUpload(files: File[]) {
    setError(null);
    setBusyUpload(true);
    try {
      const uploaded = await uploadDocuments(files);
      setDocuments((current) => [...uploaded, ...current]);
      setSelectedIds((current) => [...uploaded.map((item) => item.id), ...current]);
      showToast(`${uploaded.length} document${uploaded.length === 1 ? "" : "s"} stored`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyUpload(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedIds.length) {
      setError("Select at least one stored document to analyze.");
      return;
    }
    setError(null);
    setBusyAnalyze(true);
    try {
      const record = await createAnalysis(prompt, selectedIds);
      setAnalysis(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusyAnalyze(false);
    }
  }

  async function handleCopy() {
    if (!analysis) return;
    await navigator.clipboard.writeText(formatAnalysisCopy(analysis));
    showToast("Results copied");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="mark">FN</div>
          <div>
            <p className="eyebrow">First National · Credit operations</p>
            <h1>Multi-document intelligence workbench</h1>
            <p>Upload, extract, and review a file as a set — without mixing sources.</p>
          </div>
        </div>
        <div className="desk-badge">Banking desk · PDF / CSV / TXT</div>
      </header>

      <div className="layout">
        <aside className="panel">
          <h2>Documents</h2>
          <p className="meta">Each file is extracted and stored on its own row.</p>
          <Uploader busy={busyUpload} onUpload={handleUpload} />
          <DocumentList
            documents={documents}
            selectedIds={selectedIds}
            onToggle={(id) =>
              setSelectedIds((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
          />
        </aside>

        <main className="panel">
          <h2>Analysis prompt</h2>
          <textarea
            className="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="What should the desk look for across this file?"
          />
          <div className="actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={busyAnalyze || !selectedCount}
              onClick={() => void handleAnalyze()}
            >
              {busyAnalyze ? "Analyzing…" : `Analyze ${selectedCount} document${selectedCount === 1 ? "" : "s"}`}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setSelectedIds(documents.map((item) => item.id))}
            >
              Select all
            </button>
          </div>
          {error && <div className="alert">{error}</div>}
          {analysis && <ResultsDashboard record={analysis} onCopy={() => void handleCopy()} />}
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
