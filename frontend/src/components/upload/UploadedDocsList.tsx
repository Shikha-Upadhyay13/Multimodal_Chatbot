import type { UploadedDoc } from "../../api/uploadApi";

export function UploadedDocsList({ docs }: { docs: UploadedDoc[] }) {
  if (docs.length === 0) return null;

  return (
    <div className="doc-chip-row">
      {docs.map((doc, i) => (
        <span className="doc-chip" key={doc.documentId ?? doc.id ?? i}>
          📄 {doc.name}
        </span>
      ))}
    </div>
  );
}
