import { useRef, useState } from "react";

interface UploaderProps {
  busy: boolean;
  onUpload: (files: File[]) => Promise<void>;
}

const ACCEPT = ".pdf,.csv,.txt,application/pdf,text/csv,text/plain";

export function Uploader({ busy, onUpload }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    await onUpload([...fileList]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      className={`dropzone${active ? " active" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <strong>{busy ? "Extracting and storing…" : "Drop banking files here"}</strong>
      <span>PDF, CSV, or TXT · max 10MB each</span>
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        accept={ACCEPT}
        multiple
        disabled={busy}
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </div>
  );
}
