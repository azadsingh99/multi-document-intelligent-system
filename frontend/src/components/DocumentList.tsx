import type { DocumentSummary } from "../types";

interface DocumentListProps {
  documents: DocumentSummary[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function DocumentList({ documents, selectedIds, onToggle }: DocumentListProps) {
  if (!documents.length) {
    return <p className="empty">No documents stored yet. Upload the sample file pack to start.</p>;
  }

  return (
    <ul className="doc-list">
      {documents.map((doc) => {
        const selected = selectedIds.includes(doc.id);
        return (
          <li key={doc.id}>
            <label className={`doc-item${selected ? " selected" : ""}`}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(doc.id)}
              />
              <span>
                <b>{doc.originalName}</b>
                <span className="file-meta">
                  {formatSize(doc.sizeBytes)} · stored separately
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
