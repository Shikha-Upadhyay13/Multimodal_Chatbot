import { useEffect, useState } from "react";
import { documentInlineUrl, fetchDocumentPreview, type DocumentPreviewPayload } from "../../api/documentsApi";

export function DocumentPreviewPanel({
  id,
  downloadHref,
  onClose,
}: {
  id: string;
  downloadHref: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<DocumentPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError(null);
    fetchDocumentPreview(id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load preview");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="doc-preview-panel" aria-label="Document preview">
      <header className="doc-preview-header">
        <div>
          <div className="doc-preview-kicker">Preview</div>
          <h2>{preview?.fileName ?? "Document"}</h2>
        </div>
        <div className="doc-preview-header-actions">
          <a className="doc-download-btn" href={downloadHref} download>
            Download
          </a>
          <button type="button" className="doc-preview-close" onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      <div className={`doc-preview-body${preview && (preview.kind === "pdf" || preview.kind === "image") ? " is-bleed" : ""}`}>
        {error && <p className="doc-preview-status">{error}</p>}
        {!error && !preview && <p className="doc-preview-status">Loading preview…</p>}
        {preview && <PreviewBody id={id} preview={preview} />}
      </div>
    </aside>
  );
}

function PreviewBody({ id, preview }: { id: string; preview: DocumentPreviewPayload }) {
  if (preview.kind === "image") {
    return <img className="doc-preview-image" src={documentInlineUrl(id)} alt={preview.fileName} />;
  }

  if (preview.kind === "pdf") {
    return (
      <iframe
        className="doc-preview-frame"
        title={preview.fileName}
        src={`${documentInlineUrl(id)}#view=FitH`}
      />
    );
  }

  if (preview.kind === "docx" && preview.html) {
    return <div className="doc-preview-html" dangerouslySetInnerHTML={{ __html: preview.html }} />;
  }

  if (preview.kind === "xlsx" && preview.sheets) {
    return (
      <div className="doc-preview-sheets">
        {preview.sheets.map((sheet) => (
          <section key={sheet.name}>
            <h3>{sheet.name}</h3>
            {sheet.rows.length === 0 ? (
              <p className="doc-preview-status">This sheet is empty.</p>
            ) : (
              <div className="md-table-wrap">
                <table className="md-table">
                  <tbody>
                    {sheet.rows.map((row, i) => (
                      <tr key={`${sheet.name}-${i}`}>
                        {row.map((cell, j) =>
                          i === 0 ? <th key={j}>{cell}</th> : <td key={j}>{cell}</td>,
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <p className="doc-preview-status">
      Preview is not available for this file type. Download it to open in the matching app.
    </p>
  );
}
