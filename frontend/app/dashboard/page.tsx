"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Profile, ResumeStatus } from "@/lib/api";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resume, setResume] = useState<ResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfile().catch(() => null),
      api.getResumeStatus().catch(() => null),
    ]).then(([p, r]) => {
      setProfile(p);
      setResume(r);
      setLoading(false);
    });
  }, []);

  const profileFields = [
    "full_name", "phone", "location", "current_title",
    "years_of_experience", "work_authorization", "linkedin_url",
  ];
  const filled = profile
    ? profileFields.filter((f) => profile[f as keyof Profile] != null).length
    : 0;
  const pct = Math.round((filled / profileFields.length) * 100);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
      <p style={styles.sub}>Here's your NeuroApply setup status</p>

      <div style={styles.grid}>
        {/* Profile card */}
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardIcon}>👤</span>
            <span style={styles.cardTitle}>Profile</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
          <p style={styles.cardStat}>{pct}% complete — {filled}/{profileFields.length} fields</p>
          <Link href="/dashboard/profile" style={styles.cardLink}>
            {pct < 100 ? "Complete profile →" : "Edit profile →"}
          </Link>
        </div>

        {/* Resume card */}
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardIcon}>📄</span>
            <span style={styles.cardTitle}>Resume</span>
          </div>
          {resume?.has_resume ? (
            <>
              <span style={{ ...styles.badge, background: "#22c55e20", color: "#22c55e" }}>
                ✓ Processed
              </span>
              <p style={styles.cardStat}>{resume.file_name}</p>
              <p style={styles.cardStat}>{resume.chunks_embedded} chunks embedded for RAG</p>
            </>
          ) : (
            <>
              <span style={{ ...styles.badge, background: "#f59e0b20", color: "#f59e0b" }}>
                No resume uploaded
              </span>
              <Link href="/dashboard/resume" style={styles.cardLink}>
                Upload resume →
              </Link>
            </>
          )}
        </div>

        {/* Extension card */}
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.cardIcon}>🔌</span>
            <span style={styles.cardTitle}>Chrome Extension</span>
          </div>
          <p style={styles.cardStat} style2={styles.muted}>
            Load the extension in Chrome, then open LinkedIn Easy Apply to start autofilling.
          </p>
          <p style={{ ...styles.cardStat, color: "#888", fontSize: "12px" }}>
            Backend: localhost:8000
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statNum}>{pct}%</span>
          <span style={styles.statLabel}>Profile complete</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statNum}>{resume?.chunks_embedded ?? 0}</span>
          <span style={styles.statLabel}>Resume chunks</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statNum}>{resume?.has_resume ? "✓" : "✗"}</span>
          <span style={styles.statLabel}>Resume uploaded</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: "#888", padding: "40px" },
  page: { display: "flex", flexDirection: "column", gap: "28px" },
  heading: { color: "#e8e8e8", fontSize: "26px", fontWeight: 700, margin: 0 },
  sub: { color: "#888", fontSize: "14px", margin: "-20px 0 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardTop: { display: "flex", alignItems: "center", gap: "8px" },
  cardIcon: { fontSize: "18px" },
  cardTitle: { color: "#e8e8e8", fontWeight: 600, fontSize: "15px" },
  progressBar: {
    height: "6px",
    background: "#2a2a2a",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#6366f1",
    borderRadius: "999px",
    transition: "width 0.5s ease",
  },
  cardStat: { color: "#aaa", fontSize: "13px", margin: 0 },
  cardLink: { color: "#818cf8", fontSize: "13px", textDecoration: "none", fontWeight: 500 },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    width: "fit-content",
  },
  statsRow: {
    display: "flex",
    gap: "16px",
  },
  stat: {
    flex: 1,
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statNum: { color: "#e8e8e8", fontSize: "28px", fontWeight: 700 },
  statLabel: { color: "#888", fontSize: "12px" },
  muted: { color: "#888" },
};
