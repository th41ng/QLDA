import { useState } from "react";

export default function ResumeUploadCard({ file, onPickFile, onSubmitUpload, busy }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] || null;
    if (droppedFile) {
      onPickFile?.(droppedFile);
    }
  };

  return (
    <section className="rw-card rw-upload-card">
      <div
        className={dragging ? "rw-upload-dropzone rw-upload-dropzone--active" : "rw-upload-dropzone"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="rw-upload-dropzone-icon">CV</div>
        <div className="rw-upload-dropzone-copy">
          <h3>Upload CV có sẵn</h3>
          <p>Kéo thả file PDF, DOC hoặc DOCX vào đây, hoặc chọn file từ máy để lưu vào database.</p>
        </div>

        <div className="rw-upload-format-row">
          <span>PDF</span>
          <span>DOC</span>
          <span>DOCX</span>
        </div>

        <div className="rw-upload-dropzone-actions">
          <label className="rw-upload-pick-label">
            Chọn file
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(event) => onPickFile?.(event.target.files?.[0] || null)}
            />
          </label>
          <button type="button" className="btn" onClick={onSubmitUpload} disabled={!file || busy}>
            {busy ? "Đang upload..." : "Upload CV"}
          </button>
        </div>

        <p className="rw-upload-hint">{file ? `Đã chọn: ${file.name}` : "Kéo thả file vào đây để upload nhanh."}</p>
      </div>
    </section>
  );
}
