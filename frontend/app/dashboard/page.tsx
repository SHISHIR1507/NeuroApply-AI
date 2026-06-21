"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, Profile, ResumeStatus } from "@/lib/api";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resume, setResume] = useState<ResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfile().catch(() => null),
      api.getResumeStatus().catch(() => null),
    ]).then(([p, r]) => { setProfile(p); setResume(r); setLoading(false); });
  }, []);

  const profileFields = ["full_name", "phone", "location", "current_title", "years_of_experience", "work_authorization", "linkedin_url"];
  const filled = profile ? profileFields.filter((f) => profile[f as keyof Profile] != null).length : 0;
  const pct = Math.round((filled / profileFields.length) * 100);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#64748b", padding: 40 }}>
        <span className="na-spin-d" /> Loading your dashboard…
        <style>{`.na-spin-d{width:18px;height:18px;border-radius:50%;border:2px solid rgba(129,140,248,0.3);border-top-color:#a78bfa;animation:nar .7s linear infinite}@keyframes nar{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 style={heading}>Welcome back, {firstName} 👋</h1>
        <p style={sub}>Here&rsquo;s your NeuroApply setup status</p>
      </motion.div>

      {/* Cards */}
      <div style={grid}>
        <Card delay={0.05} accent="#6366f1" icon={<IconUser />} title="Profile">
          <div style={progressBar}><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} style={progressFill} /></div>
          <p style={stat}>{pct}% complete — {filled}/{profileFields.length} fields</p>
          <Link href="/dashboard/profile" style={cardLink}>{pct < 100 ? "Complete profile →" : "Edit profile →"}</Link>
        </Card>

        <Card delay={0.13} accent="#4ade80" icon={<IconFile />} title="Resume">
          {resume?.has_resume ? (
            <>
              <span style={{ ...badge, background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>✓ Processed</span>
              <p style={stat}>{resume.file_name}</p>
              <p style={statMuted}>{resume.chunks_embedded} chunks embedded for RAG</p>
            </>
          ) : (
            <>
              <span style={{ ...badge, background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>No resume uploaded</span>
              <Link href="/dashboard/resume" style={cardLink}>Upload resume →</Link>
            </>
          )}
        </Card>

        <Card delay={0.21} accent="#a78bfa" icon={<IconPlug />} title="Chrome Extension">
          <p style={stat}>Open LinkedIn Easy Apply and NeuroApply fills every field automatically.</p>
          <span style={{ ...badge, background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", marginTop: 2 }}>● Connected to cloud</span>
        </Card>
      </div>

      {/* Stats */}
      <div style={statsRow}>
        <Stat delay={0.28} value={`${pct}%`} label="Profile complete" />
        <Stat delay={0.34} value={String(resume?.chunks_embedded ?? 0)} label="Resume chunks" />
        <Stat delay={0.40} value={resume?.has_resume ? "✓" : "—"} label="Resume uploaded" />
      </div>
    </div>
  );
}

function Card({ children, title, icon, accent, delay }: { children: React.ReactNode; title: string; icon: React.ReactNode; accent: string; delay: number; }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={card}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${accent}40`; el.style.transform = "translateY(-3px)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(255,255,255,0.08)"; el.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right, ${accent}14, transparent 70%)`, pointerEvents: "none" }} />
      <div style={cardTop}>
        <span style={{ ...iconWrap, background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}>{icon}</span>
        <span style={cardTitle}>{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }} style={statCard}>
      <span style={statNum}>{value}</span>
      <span style={statLabel}>{label}</span>
    </motion.div>
  );
}

function IconUser() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function IconFile() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>; }
function IconPlug() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v5" /></svg>; }

/* styles */
const heading: React.CSSProperties = { color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "6px 0 0" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 };
const card: React.CSSProperties = {
  position: "relative", overflow: "hidden",
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 22,
  display: "flex", flexDirection: "column", gap: 11,
  transition: "border-color 0.25s, transform 0.25s",
};
const cardTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 2 };
const iconWrap: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" };
const cardTitle: React.CSSProperties = { color: "#f1f5f9", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" };
const progressBar: React.CSSProperties = { height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden", marginTop: 4 };
const progressFill: React.CSSProperties = { height: "100%", background: "linear-gradient(90deg, #6366f1, #a78bfa)", borderRadius: 999, boxShadow: "0 0 12px rgba(129,140,248,0.6)" };
const stat: React.CSSProperties = { color: "#cbd5e1", fontSize: 13, margin: 0, lineHeight: 1.55 };
const statMuted: React.CSSProperties = { color: "#64748b", fontSize: 12, margin: 0 };
const cardLink: React.CSSProperties = { color: "#a78bfa", fontSize: 13, textDecoration: "none", fontWeight: 600, marginTop: 2 };
const badge: React.CSSProperties = { display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, width: "fit-content" };
const statsRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 };
const statCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 22,
  display: "flex", flexDirection: "column", gap: 6,
};
const statNum: React.CSSProperties = {
  fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
  background: "linear-gradient(135deg, #6366f1, #a78bfa)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
};
const statLabel: React.CSSProperties = { color: "#64748b", fontSize: 12.5 };
