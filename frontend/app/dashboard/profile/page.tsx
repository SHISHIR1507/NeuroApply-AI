"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, Profile } from "@/lib/api";
import OnboardingChat from "@/components/OnboardingChat";

type View = "welcome" | "chat" | "summary";

const GROUPS: { title: string; fields: { key: keyof Profile; label: string }[] }[] = [
  { title: "Personal", fields: [
    { key: "full_name", label: "Full name" }, { key: "email", label: "Email" },
    { key: "phone", label: "Phone" }, { key: "location", label: "Location" },
  ]},
  { title: "Work", fields: [
    { key: "current_title", label: "Current title" }, { key: "current_company", label: "Company" },
    { key: "years_of_experience", label: "Experience (yrs)" }, { key: "expected_salary", label: "Expected salary" },
    { key: "notice_period", label: "Notice period" }, { key: "work_authorization", label: "Work authorization" },
  ]},
  { title: "Links", fields: [
    { key: "linkedin_url", label: "LinkedIn" }, { key: "github_url", label: "GitHub" }, { key: "portfolio_url", label: "Portfolio" },
  ]},
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("welcome");

  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p || {});
      // Returning users with data land on the summary; fresh users get the welcome.
      const hasData = !!(p && (p.full_name || p.current_title || p.years_of_experience != null));
      setView(hasData ? "summary" : "welcome");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function handleFieldsSaved(fields: Record<string, unknown>) {
    setProfile((prev) => ({ ...prev, ...fields }));
  }

  const filledCount = useMemo(() => {
    const keys = ["full_name", "phone", "location", "current_title", "years_of_experience", "work_authorization", "linkedin_url"];
    return keys.filter((k) => profile[k as keyof Profile] != null && profile[k as keyof Profile] !== "").length;
  }, [profile]);

  if (loading) return <div style={{ color: "#64748b", padding: 40 }}>Loading…</div>;

  return (
    <div>
      <AnimatePresence mode="wait">
        {view === "welcome" && <Welcome key="w" onStart={() => setView("chat")} onManual={() => setView("summary")} />}
        {view === "chat" && (
          <motion.div key="c" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Header title="Let's build your profile" sub="Chat naturally — I'll capture everything as we go." />
            <div style={chatGrid}>
              <OnboardingChat profile={profile} onFieldsSaved={handleFieldsSaved} />
              <CapturedPanel profile={profile} filledCount={filledCount} onDone={() => setView("summary")} />
            </div>
          </motion.div>
        )}
        {view === "summary" && (
          <motion.div key="s" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <Header title="Your profile" sub="This is what NeuroApply uses to autofill your applications." />
              <button onClick={() => setView("chat")} className="na-cta" style={{ marginTop: 6 }}>
                <SparkIcon /> Update with assistant
              </button>
            </div>
            <Summary profile={profile} onChange={setProfile} />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .na-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
          border: none; border-radius: 12px; padding: 11px 18px; font-size: 13.5px; font-weight: 600;
          cursor: pointer; box-shadow: 0 8px 22px rgba(99,102,241,0.4); transition: transform .15s, box-shadow .25s;
        }
        .na-cta:hover { box-shadow: 0 10px 28px rgba(99,102,241,0.55); }
        .na-cta:active { transform: scale(0.97); }
        .na-ghost { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8;
          border-radius: 12px; padding: 11px 18px; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .15s; }
        .na-ghost:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

function Welcome({ onStart, onManual }: { onStart: () => void; onManual: () => void }) {
  return (
    <motion.div key="w" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={welcomeCard}>
      <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 320, height: 180, background: "radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} style={welcomeIcon}>
        <SparkIcon size={30} />
      </motion.div>
      <h1 style={welcomeTitle}>Let&rsquo;s set you up</h1>
      <p style={welcomeText}>
        Answer a few quick questions and NeuroApply will autofill every LinkedIn Easy Apply form for you — accurately, in seconds.
        No more retyping the same answers fifty times. It takes about <b style={{ color: "#c7d2fe" }}>3 minutes</b>.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
        <button onClick={onStart} className="na-cta" style={{ padding: "13px 26px", fontSize: 15 }}>
          Start with the assistant <ArrowIcon />
        </button>
        <button onClick={onManual} className="na-ghost" style={{ padding: "13px 22px", fontSize: 15 }}>
          I&rsquo;ll fill it manually
        </button>
      </div>
      <div style={{ display: "flex", gap: 22, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
        {["Conversational", "Auto-saved", "Edit anytime"].map((t) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 7, color: "#64748b", fontSize: 13 }}>
            <CheckIcon /> {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CapturedPanel({ profile, filledCount, onDone }: { profile: Profile; filledCount: number; onDone: () => void }) {
  const items = GROUPS.flatMap((g) => g.fields).filter((f) => profile[f.key] != null && profile[f.key] !== "");
  return (
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>Captured so far</span>
        <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{filledCount}/7</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, flex: 1, overflowY: "auto" }}>
        {items.length === 0 && <p style={{ color: "#475569", fontSize: 13 }}>Nothing yet — start chatting and details will appear here as they&rsquo;re saved.</p>}
        <AnimatePresence>
          {items.map((f) => (
            <motion.div key={String(f.key)} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={capturedRow}>
              <span style={{ color: "#64748b", fontSize: 12 }}>{f.label}</span>
              <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, textAlign: "right" }}>{String(profile[f.key])}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <button onClick={onDone} className="na-ghost" style={{ marginTop: 14, width: "100%" }}>Done — view my profile →</button>
    </div>
  );
}

function Summary({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const skills = profile.skills ?? [];
  const [editingSkills, setEditingSkills] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveSkills() {
    const list = draft.split(",").map((s) => s.trim()).filter(Boolean);
    // de-dupe (case-insensitive), preserve order
    const seen = new Set<string>();
    const deduped = list.filter((s) => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    setSaving(true);
    try {
      const updated = await api.updateProfile({ skills: deduped });
      onChange(updated);
      setEditingSkills(false);
    } catch { /* keep editing */ } finally { setSaving(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
      {GROUPS.map((g, gi) => (
        <motion.div key={g.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08, duration: 0.45 }} style={summaryCard}>
          <h3 style={summaryTitle}>{g.title}</h3>
          <div style={summaryGrid}>
            {g.fields.map((f) => {
              const val = profile[f.key];
              const has = val != null && val !== "";
              return (
                <div key={String(f.key)} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{f.label}</span>
                  <span style={{ color: has ? "#e2e8f0" : "#475569", fontSize: 14, fontWeight: has ? 500 : 400 }}>
                    {has ? String(val) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.45 }} style={summaryCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ ...summaryTitle, margin: 0 }}>Skills</h3>
          {!editingSkills && (
            <button onClick={() => { setDraft(skills.join(", ")); setEditingSkills(true); }} style={editLink}>
              {skills.length ? "Edit" : "Add"}
            </button>
          )}
        </div>

        {editingSkills ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveSkills(); if (e.key === "Escape") setEditingSkills(false); }}
              placeholder="Python, JavaScript, PostgreSQL, React…" className="na-skills-input" />
            <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>Separate skills with commas.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveSkills} disabled={saving} className="na-cta" style={{ padding: "9px 18px", fontSize: 13 }}>{saving ? "Saving…" : "Save skills"}</button>
              <button onClick={() => setEditingSkills(false)} className="na-ghost" style={{ padding: "9px 16px", fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        ) : skills.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {skills.map((s) => <span key={s} style={skillTag}>{s}</span>)}
          </div>
        ) : <span style={{ color: "#475569", fontSize: 14 }}>None added yet — click Add, or ask the assistant.</span>}

        <style>{`
          .na-skills-input { width:100%; padding:11px 13px; font-size:14px; background:rgba(255,255,255,0.05);
            border:1px solid rgba(129,140,248,0.5); border-radius:10px; color:#f1f5f9; outline:none;
            box-shadow:0 0 0 3px rgba(129,140,248,0.16); }
        `}</style>
      </motion.div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h1 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>{sub}</p>
    </div>
  );
}

function SparkIcon({ size = 15 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" /></svg>; }
function ArrowIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>; }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>; }

/* styles */
const chatGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginTop: 22, alignItems: "stretch" };
const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20, padding: 18, display: "flex", flexDirection: "column",
};
const capturedRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px",
  background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)",
};
const welcomeCard: React.CSSProperties = {
  position: "relative", overflow: "hidden", textAlign: "center", maxWidth: 620, margin: "40px auto 0",
  padding: "48px 40px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(22px)",
  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 26,
  boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
};
const welcomeIcon: React.CSSProperties = {
  width: 70, height: 70, margin: "0 auto 22px", borderRadius: 20, color: "#a78bfa",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(99,102,241,0.14)", border: "1px solid rgba(129,140,248,0.3)", boxShadow: "0 0 30px rgba(99,102,241,0.4)",
  position: "relative", zIndex: 1,
};
const welcomeTitle: React.CSSProperties = {
  fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 14px",
  background: "linear-gradient(135deg, #f1f5f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
};
const welcomeText: React.CSSProperties = { color: "#94a3b8", fontSize: 15.5, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" };
const summaryCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18, padding: 22,
};
const summaryTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 };
const editLink: React.CSSProperties = { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.3)", color: "#a5b4fc", fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 9, cursor: "pointer" };
const skillTag: React.CSSProperties = {
  background: "rgba(99,102,241,0.14)", color: "#c7d2fe", border: "1px solid rgba(129,140,248,0.3)",
  padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500,
};
