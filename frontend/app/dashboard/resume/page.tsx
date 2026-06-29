"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api, ResumeStatus } from "@/lib/api";

export default function ResumePage() {
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.getResumeStatus().then(setStatus).catch(() => {}); }, []);

  async function upload(file: File) {
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setError("Only PDF, DOCX, or TXT files are supported");
      return;
    }
    setUploading(true); setError(""); setSuccess("");
    try {
      await api.uploadResume(file);
      setSuccess("✓ Resume processed — your background is ready to power AI answers");
      setStatus(await api.getResumeStatus());
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
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 style={heading}>Resume</h1>
        <p style={sub}>Upload your resume to power AI answers for open-ended application questions</p>
      </motion.div>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}
        style={{ ...dropzone, ...(dragOver ? dropzoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <div style={uploadIcon}>
          {uploading ? <span className="na-spin" /> : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
          )}
        </div>
        <p style={dropText}>{uploading ? "Processing your resume…" : "Drop your resume here, or click to browse"}</p>
        <p style={dropHint}>PDF, DOCX, or TXT — max 10MB</p>
      </motion.div>

      {error && <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>}
      {success && <p style={{ color: "#4ade80", fontSize: 13, margin: 0 }}>{success}</p>}

      {/* Current resume */}
      {status?.has_resume && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={fileIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            </span>
            <div>
              <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, margin: "0 0 6px" }}>{status.file_name}</p>
              <span style={badge}>✓ Processed</span>
            </div>
          </div>
          <div style={statsGrid}>
            <MiniStat value="Active" label="Status" />
            <MiniStat value={String(status.fields_extracted ?? 0)} label="Details learned" />
            <MiniStat value={status.parsed_at ? new Date(status.parsed_at).toLocaleDateString() : "—"} label="Processed on" />
          </div>
          <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>Re-upload anytime to replace it. Your resume helps answer open-ended questions your profile doesn&rsquo;t cover.</p>
        </motion.div>
      )}

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }} style={infoBox}>
        <h3 style={infoTitle}>What happens to your resume</h3>
        <ol style={steps}>
          <li>We read your PDF or DOCX securely</li>
          <li>AI extracts your details and fills in your profile automatically</li>
          <li>Your experience is remembered for open-ended application questions</li>
          <li>When a form asks something not in your profile, NeuroApply answers it from your resume</li>
        </ol>
      </motion.div>

      <style>{`
        .na-spin { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(129,140,248,0.3); border-top-color: #a78bfa; animation: na-rot .7s linear infinite; }
        @keyframes na-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={miniStat}>
      <span style={miniNum}>{value}</span>
      <span style={miniLabel}>{label}</span>
    </div>
  );
}

const heading: React.CSSProperties = { color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "6px 0 0" };
const dropzone: React.CSSProperties = {
  border: "1.5px dashed rgba(255,255,255,0.14)", borderRadius: 18, padding: "44px 24px",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer",
  background: "rgba(255,255,255,0.025)", backdropFilter: "blur(12px)",
  transition: "border-color .2s, background .2s, box-shadow .2s",
};
const dropzoneActive: React.CSSProperties = {
  borderColor: "rgba(129,140,248,0.7)", background: "rgba(99,102,241,0.07)",
  boxShadow: "0 0 0 3px rgba(129,140,248,0.14)",
};
const uploadIcon: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.28)",
};
const dropText: React.CSSProperties = { color: "#e2e8f0", fontSize: 15, fontWeight: 500, margin: 0 };
const dropHint: React.CSSProperties = { color: "#64748b", fontSize: 13, margin: 0 };
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 24,
  display: "flex", flexDirection: "column", gap: 16,
};
const fileIcon: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(99,102,241,0.14)", border: "1px solid rgba(129,140,248,0.3)",
};
const badge: React.CSSProperties = {
  background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
  padding: "3px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600,
};
const statsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 };
const miniStat: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14,
  display: "flex", flexDirection: "column", gap: 4, border: "1px solid rgba(255,255,255,0.06)",
};
const miniNum: React.CSSProperties = { color: "#f1f5f9", fontSize: 20, fontWeight: 700 };
const miniLabel: React.CSSProperties = { color: "#64748b", fontSize: 12 };
const infoBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 24,
};
const infoTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" };
const steps: React.CSSProperties = { color: "#94a3b8", fontSize: 13, lineHeight: 1.9, paddingLeft: 20, margin: 0 };
