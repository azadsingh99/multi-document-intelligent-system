import type { AnalysisRecord } from "../types";

interface ResultsDashboardProps {
  record: AnalysisRecord;
  onCopy: () => void;
}

function SourceChip({ name, id }: { name: string; id: string }) {
  return (
    <span className="source-chip" title={id}>
      {name}
    </span>
  );
}

export function ResultsDashboard({ record, onCopy }: ResultsDashboardProps) {
  const result = record.result;
  if (!result) return null;

  return (
    <section className="results">
      <div className="actions">
        <button className="btn btn-ghost" type="button" onClick={onCopy}>
          Copy results
        </button>
      </div>

      <article className="card">
        <p className="eyebrow">Collective review</p>
        <h3>Summary</h3>
        <p className="summary">{result.summary}</p>
      </article>

      <div className="grid-2">
        <article className="card">
          <h3>Key facts</h3>
          <div className="facts">
            {result.keyFacts.map((item) => (
              <div className="finding" key={item.id}>
                <p>{item.text}</p>
                <SourceChip name={item.source.documentName} id={item.source.documentId} />
              </div>
            ))}
            {!result.keyFacts.length && <p className="empty">No labeled facts extracted.</p>}
          </div>
        </article>

        <article className="card">
          <h3>Missing information</h3>
          <div className="gaps">
            {result.missingInformation.map((item) => (
              <div className="finding" key={item.id}>
                <p>{item.text}</p>
                <SourceChip name={item.source.documentName} id={item.source.documentId} />
              </div>
            ))}
            {!result.missingInformation.length && <p className="empty">No gaps flagged.</p>}
          </div>
        </article>
      </div>

      <article className="card">
        <h3>Discrepancies</h3>
        {result.discrepancies.map((item) => (
          <div className="diff" key={item.id}>
            <p>
              <b>{item.field}.</b> {item.description}
            </p>
            <div className="diff-values">
              {item.values.map((value) => (
                <div key={`${item.id}-${value.source.documentId}-${value.value}`}>
                  <div>{value.value}</div>
                  <SourceChip name={value.source.documentName} id={value.source.documentId} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {!result.discrepancies.length && <p className="empty">No cross-document conflicts found.</p>}
      </article>
    </section>
  );
}
