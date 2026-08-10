import { useRef, useState } from "react";
import { uploadDocument, type UploadedDoc } from "../../api/uploadApi";

type Status = "idle" | "uploading" | "success" | "error";

export function FileUploadButton({ onUploaded }: { onUploaded: (doc: UploadedDoc) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setStatus("uploading");
    setError(null);
    try {
      const doc = await uploadDocument(file);
      onUploaded(doc);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1800);
    }
  };

  return (
    <div className="upload-control">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp,.bmp"
        hidden
        onChange={handleChange}
      />
      <button
        type="button"
        className="upload-button"
        data-status={status}
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        title="Upload a document (PDF, Word, Excel, PowerPoint, or image)"
      >
        {status === "uploading" && <span className="upload-spinner" />}
        {status === "success" && <span className="upload-check">✓</span>}
        {status === "error" && <span className="upload-x">✕</span>}
        {status === "idle" && "📎"}
      </button>
      {error && status === "error" && <span className="upload-error">{error}</span>}
    </div>
  );
}
