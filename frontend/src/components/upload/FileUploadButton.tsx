import { useRef, useState } from "react";
import { uploadDocument, type UploadedDoc } from "../../api/uploadApi";

export function FileUploadButton({ onUploaded }: { onUploaded: (doc: UploadedDoc) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const doc = await uploadDocument(file);
      onUploaded(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
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
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title="Upload a document (PDF, Word, Excel, PowerPoint, or image)"
      >
        {isUploading ? "Uploading..." : "+ File"}
      </button>
      {error && <span className="upload-error">{error}</span>}
    </div>
  );
}
