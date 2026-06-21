"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, Profile, ResumeStatus, ApplicationStats, ApplicationItem } from "@/lib/api";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resume, setResume] = useState<ResumeStatus | null>(null);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [recent, setRecent] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfile().catch(() => null),
      api.getResumeStatus().catch(() => null),
      api.getApplicationStats().catch(() => null),
      api.getApplications(8).catch(() => []),
    ]).then(([p, r, s, a]) => {
      setProfile(p); setResume(r); setStats(s); setRecent(a || []);
      setLoading(false);
    });
  }, []);

  const profileFields = ["full_name", "phone", "location", "current_title", "years_of_experience", "work_authorization", "linkedin_url"];
  const filled = profile ? profileFields.filter((f) => profile[f as keyof Profile] != null && profile[f as keyof Profile] !== "").length : 0;
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
  const returning = typeof window !== "undefined" && localStorage.getItem("onboarded") === "1" && (stats?.total_applied ?? 0) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 style={heading}>{returning ? "Welcome back" : "Welcome"}, {firstName} 👋</h1>
        <p style={sub}>Your job-hunt command center</p>
      </motion.div>

      {/* Stat strip */}
      <div style={statStrip}>
        <BigStat delay={0.05} value={String(stats?.total_applied ?? 0)} label="Jobs applied" icon={<IconBriefcase />} accent="#6366f1" />
        <BigStat delay={0.11} value={formatTime(stats?.time_saved_minutes ?? 0)} label="Time saved" icon={<IconClock />} accent="#4ade80" />
        <BigStat delay={0.17} value={String(stats?.this_week ?? 0)} label="Applied this week" icon={<IconTrend />} accent="#22d3ee" />
        <BigStat delay={0.23} value={`${pct}%`} label="Profile strength" icon={<IconUser />} accent="#a78bfa" />
      </div>

      {/* Main grid */}
      <div style={mainGrid}>
        {/* Left column: actions + setup */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel delay={0.28} title="Quick actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ActionRow href="/dashboard/profile" accent="#6366f1" icon={<IconSpark />} title="Build profile with AI" desc="Chat to set up or update your details" />
              <ActionRow href="/dashboard/resume" accent="#4ade80" icon={<IconFile />} title={resume?.has_resume ? "Manage resume" : "Upload resume"} desc={resume?.has_resume ? "Replace or review your resume" : "Power AI answers from your CV"} />
              <ActionRow external href="https://chromewebstore.google.com/detail/nglhmaeijiphnabgdeeimepoophpffpd" accent="#a78bfa" icon={<IconPlug />} title="Get the extension" desc="Install on Chrome to start autofilling" />
            </div>
          </Panel>

          <Panel delay={0.34} title="Setup status">
            <SetupRow done={pct === 100} label="Complete your profile" detail={`${filled}/${profileFields.length} fields`} />
            <SetupRow done={!!resume?.has_resume} label="Upload your resume" detail={resume?.has_resume ? "Active" : "Not yet"} />
            <SetupRow done label="Backend connected" detail="Cloud" />
          </Panel>
        </div>

        {/* Right column: recent activity */}
        <Panel delay={0.3} title="Recent applications" full>
          {recent.length === 0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}><IconBriefcase /></div>
              <p style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>No applications yet</p>
              <p style={{ color: "#64748b", fontSize: 13, margin: 0, maxWidth: 280 }}>
                Open a LinkedIn Easy Apply and submit — NeuroApply logs each one here automatically.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.34 + i * 0.04 }}
                  style={{ ...activityRow, borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={companyAvatar}>{(a.company || "?").charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.job_title || "Application"}</p>
                    <p style={{ color: "#64748b", fontSize: 12.5, margin: "2px 0 0" }}>{a.company || "—"}</p>
                  </div>
                  <span style={{ color: "#475569", fontSize: 12, whiteSpace: "nowrap" }}>{relativeTime(a.applied_at)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------- components ---------- */
function BigStat({ value, label, icon, accent, delay }: { value: string; label: string; icon: React.ReactNode; accent: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={bigStatCard}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`, pointerEvents: "none" }} />
      <span style={{ ...statIcon, background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}>{icon}</span>
      <span style={{ ...bigNum, background: `linear-gradient(135deg, ${accent}, #f1f5f9)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{value}</span>
      <span style={bigLabel}>{label}</span>
    </motion.div>
  );
}

function Panel({ children, title, delay, full }: { children: React.ReactNode; title: string; delay: number; full?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...panel, ...(full ? { height: "100%" } : {}) }}>
      <h3 style={panelTitle}>{title}</h3>
      {children}
    </motion.div>
  );
}

function ActionRow({ href, icon, title, desc, accent, external }: { href: string; icon: React.ReactNode; title: string; desc: string; accent: string; external?: boolean }) {
  const inner = (
    <div style={actionRow}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accent}10`; (e.currentTarget as HTMLElement).style.borderColor = `${accent}33`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}>
      <span style={{ ...actionIcon, background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: "#e2e8f0", fontSize: 13.5, fontWeight: 600, margin: 0 }}>{title}</p>
        <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>{desc}</p>
      </div>
      <span style={{ color: "#475569" }}><IconArrow /></span>
    </div>
  );
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
    : <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
}

function SetupRow({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${done ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.12)"}` }}>
        {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#475569" }} />}
      </span>
      <span style={{ flex: 1, color: done ? "#94a3b8" : "#cbd5e1", fontSize: 13.5 }}>{label}</span>
      <span style={{ color: done ? "#4ade80" : "#64748b", fontSize: 12, fontWeight: 600 }}>{detail}</span>
    </div>
  );
}

/* icons */
function IconBriefcase() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>; }
function IconClock() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>; }
function IconTrend() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>; }
function IconUser() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function IconSpark() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" /></svg>; }
function IconFile() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>; }
function IconPlug() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v5" /></svg>; }
function IconArrow() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>; }

/* helpers */
function formatTime(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60); const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* styles */
const heading: React.CSSProperties = { color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "6px 0 0" };
const statStrip: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 };
const bigStatCard: React.CSSProperties = {
  position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 6,
};
const statIcon: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 };
const bigNum: React.CSSProperties = { fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 };
const bigLabel: React.CSSProperties = { color: "#64748b", fontSize: 13 };
const mainGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: 16, alignItems: "start" };
const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18, padding: 22,
};
const panelTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" };
const actionRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12,
  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all .18s",
};
const actionIcon: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" };
const activityRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 0" };
const companyAvatar: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))", border: "1px solid rgba(129,140,248,0.25)",
  color: "#c7d2fe", fontWeight: 700, fontSize: 15, flexShrink: 0,
};
const emptyState: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "36px 16px", gap: 6 };
const emptyIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6,
  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#a78bfa",
};
