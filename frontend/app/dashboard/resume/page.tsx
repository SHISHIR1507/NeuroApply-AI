"use client";
import { useEffect, useRef, useState } from "react";
import { api, ResumeStatus } from "@/lib/api";

export default function ResumePage() {
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getResumeStatus().then(setStatus).catch(() => {});
  }, []);

  async function upload(file: File) {
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setError("Only PDF, DOCX, or TXT files are supported");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.uploadResume(file);
      setSuccess(`✓ Resume processed — ${result.chunks_embedded} ${result.chunks_embedded === 1 ? "chunk" : "chunks"} embedded`);
      const updated = await api.getResumeStatus();
      setStatus(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Resume</h1>
        <p style={styles.sub}>Upload your resume to enable RAG-based autofill for open-ended questions</p>
      </div>

      {/* Upload zone */}
      <div
        style={{ ...styles.dropzone, ...(dragOver ? styles.dropzoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <span style={{ fontSize: "36px" }}>{uploading ? "⏳" : "📤"}</span>
        <p style={styles.dropText}>
          {uploading ? "Processing resume..." : "Drop your resume here or click to browse"}
        </p>
        <p style={styles.dropHint}>PDF, DOCX, or TXT — max 10MB</p>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      {/* Current resume status */}
      {status?.has_resume && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: "20px" }}>📄</span>
            <div>
              <p style={styles.fileName}>{status.file_name}</p>
              <span style={styles.badge}>✓ Processed</span>
            </div>
          </div>
          <div style={styles.statsGrid}>
            <div style={styles.stat}>
              <span style={styles.statNum}>{status.chunks_embedded ?? 0}</span>
              <span style={styles.statLabel}>Chunks embedded</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>{status.fields_extracted ?? 0}</span>
              <span style={styles.statLabel}>Fields extracted</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statNum}>{status.parsed_at ? new Date(status.parsed_at).toLocaleDateString() : "—"}</span>
              <span style={styles.statLabel}>Processed on</span>
            </div>
          </div>
          <p style={styles.hint}>
            Re-upload to replace. Embeddings are used as a fallback when structured profile data doesn't cover a question.
          </p>
        </div>
      )}

      {/* How it works */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>How resume processing works</h3>
        <ol style={styles.steps}>
          <li>Text is extracted from your PDF/DOCX</li>
          <li>OpenAI (gpt-4o-mini) parses it into structured data and auto-fills your profile</li>
          <li>The text is split into chunks and embedded using text-embedding-3-small</li>
          <li>When a form field can't be answered from your profile, we search these embeddings and return the most relevant chunk</li>
        </ol>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  header: { marginBottom: "8px" },
  heading: { color: "#e8e8e8", fontSize: "26px", fontWeight: 700, margin: "0 0 6px" },
  sub: { color: "#888", fontSize: "14px", margin: 0 },
  dropzone: {
    border: "2px dashed #2a2a2a",
    borderRadius: "12px",
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    background: "#1a1a1a",
  },
  dropzoneActive: {
    borderColor: "#6366f1",
    background: "#6366f110",
  },
  dropText: { color: "#e8e8e8", fontSize: "15px", fontWeight: 500, margin: 0 },
  dropHint: { color: "#888", fontSize: "13px", margin: 0 },
  error: { color: "#ef4444", fontSize: "13px", margin: 0 },
  success: { color: "#22c55e", fontSize: "13px", margin: 0 },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: "14px" },
  fileName: { color: "#e8e8e8", fontWeight: 600, fontSize: "15px", margin: "0 0 6px" },
  badge: {
    background: "#22c55e20",
    color: "#22c55e",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" },
  stat: {
    background: "#222",
    borderRadius: "8px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statNum: { color: "#e8e8e8", fontSize: "22px", fontWeight: 700 },
  statLabel: { color: "#888", fontSize: "12px" },
  hint: { color: "#666", fontSize: "12px", margin: 0 },
  infoBox: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "24px",
  },
  infoTitle: { color: "#aaa", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" },
  steps: { color: "#888", fontSize: "13px", lineHeight: "1.8", paddingLeft: "20px", margin: 0 },
};
