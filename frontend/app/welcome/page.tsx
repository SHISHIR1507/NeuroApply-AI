"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { api, Profile } from "@/lib/api";
import Aurora from "@/components/Aurora";
import OnboardingChat from "@/components/OnboardingChat";

type Step = "intro" | "uploading" | "review" | "chat";

const REVIEW_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "full_name", label: "Name" }, { key: "current_title", label: "Title" },
  { key: "current_company", label: "Company" }, { key: "years_of_experience", label: "Experience (yrs)" },
  { key: "location", label: "Location" }, { key: "phone", label: "Phone" },
  { key: "linkedin_url", label: "LinkedIn" }, { key: "github_url", label: "GitHub" },
];

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("intro");
  const [extracted, setExtracted] = useState<Profile | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    api.getProfile().then((p) => setName(p?.full_name?.split(" ")[0] ?? "")).catch(() => {});
  }, [router]);

  async function handleResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setStep("uploading");
    try {
      await api.uploadResume(file);
      const profile = await api.getProfile();
      setExtracted(profile);
      setName(profile?.full_name?.split(" ")[0] ?? name);
      setStep("review");
    } catch {
      setUploadError("Couldn't read that file. Try a PDF or DOCX, or set up by chat.");
      setStep("intro");
    }
  }

  function finish() {
    localStorage.setItem("onboarded", "1");
    router.push("/dashboard");
  }

  return (
    <main style={wrap}>
      <Aurora />
      <AnimatePresence mode="wait">
        {step === "intro" ? (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5 }} style={introGrid}>
            {/* Left: copy */}
            <div style={{ maxWidth: 480 }}>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} style={badge}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                Welcome aboard
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={title}>
                {name ? <>Hey {name}, your job hunt<br /></> : <>Your job hunt<br /></>}
                <span style={gradientText}>just got a superpower.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} style={lead}>
                NeuroApply fills every LinkedIn Easy Apply form for you — accurately, in seconds.
                Apply to <b style={{ color: "#c7d2fe" }}>50 jobs</b> in the time it used to take for one.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} style={{ display: "flex", flexDirection: "column", gap: 11, margin: "26px 0 32px" }}>
                {[
                  "Build your profile once — by chatting, not filling forms",
                  "Watch applications fill themselves on LinkedIn",
                  "It learns your answers and reuses them everywhere",
                ].map((t, i) => (
                  <motion.div key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={checkChip}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
                    <span style={{ color: "#cbd5e1", fontSize: 14.5 }}>{t}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }} onChange={handleResume} />
                <button onClick={() => fileRef.current?.click()} className="na-cta" style={{ padding: "14px 26px", fontSize: 15.5 }}>
                  <UploadIcon /> Upload my resume
                </button>
                <button onClick={() => setStep("chat")} className="na-ghost" style={{ padding: "14px 22px", fontSize: 15 }}>Set up by chat</button>
              </motion.div>
              {uploadError
                ? <p style={{ color: "#fca5a5", fontSize: 12.5, marginTop: 14 }}>{uploadError}</p>
                : <p style={{ color: "#475569", fontSize: 12.5, marginTop: 16 }}>Fastest way — we&rsquo;ll pull your details from your resume, then just ask about anything missing.</p>}
              <button onClick={finish} style={{ background: "none", border: "none", color: "#475569", fontSize: 12.5, marginTop: 12, cursor: "pointer", textDecoration: "underline" }}>Skip for now</button>
            </div>

            {/* Right: animated auto-fill illustration */}
            <ApplyAnimation />
          </motion.div>
        ) : step === "uploading" ? (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ ...chatWrap, textAlign: "center", maxWidth: 460 }}>
            <div style={uploadingCard}>
              <span className="na-spin-lg" />
              <h2 style={{ ...title, fontSize: 24, margin: "20px 0 8px" }}>Reading your resume…</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Extracting your details with AI — this takes a few seconds.</p>
            </div>
            <style>{`.na-spin-lg{width:42px;height:42px;border-radius:50%;border:3px solid rgba(129,140,248,0.25);border-top-color:#a78bfa;animation:nars .8s linear infinite;display:inline-block}@keyframes nars{to{transform:rotate(360deg)}}`}</style>
          </motion.div>
        ) : step === "review" ? (
          <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ ...chatWrap, maxWidth: 620 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={reviewCheck}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
              <h2 style={{ ...title, fontSize: 28, margin: "16px 0 8px" }}>Here&rsquo;s what we pulled in</h2>
              <p style={{ color: "#64748b", fontSize: 14.5, margin: 0 }}>From your resume. Want to edit or add anything?</p>
            </div>

            <div style={reviewCard}>
              <div style={reviewGrid}>
                {REVIEW_FIELDS.map((f) => {
                  const v = extracted?.[f.key];
                  const has = v != null && v !== "";
                  return (
                    <div key={String(f.key)} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ color: "#64748b", fontSize: 11.5 }}>{f.label}</span>
                      <span style={{ color: has ? "#e2e8f0" : "#475569", fontSize: 14, fontWeight: has ? 500 : 400 }}>{has ? String(v) : "—"}</span>
                    </div>
                  );
                })}
              </div>
              {extracted?.skills?.length ? (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ color: "#64748b", fontSize: 11.5 }}>Skills</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                    {extracted.skills.map((s) => <span key={s} style={reviewSkill}>{s}</span>)}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
              <button onClick={() => setStep("chat")} className="na-cta" style={{ padding: "13px 26px", fontSize: 15 }}>
                Fill in the rest <Arrow />
              </button>
              <button onClick={finish} className="na-ghost" style={{ padding: "13px 22px", fontSize: 15 }}>Looks good — go to dashboard</button>
            </div>
            <p style={{ textAlign: "center", color: "#475569", fontSize: 12.5, marginTop: 14 }}>You can refine everything anytime under Profile.</p>
          </motion.div>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={chatWrap}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ ...title, fontSize: 30, margin: 0 }}>Let&rsquo;s build your profile</h2>
              <p style={{ color: "#64748b", fontSize: 14.5, margin: "8px 0 0" }}>Chat naturally — I&rsquo;ll capture everything automatically.</p>
            </div>
            <OnboardingChat profile={extracted} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <button onClick={finish} className="na-cta" style={{ padding: "13px 30px", fontSize: 15 }}>
                I&rsquo;m done — go to dashboard <Arrow />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .na-cta { display:inline-flex; align-items:center; gap:9px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          border:none; border-radius:13px; font-weight:600; cursor:pointer; box-shadow:0 10px 26px rgba(99,102,241,0.42); transition:transform .15s, box-shadow .25s; }
        .na-cta:hover { box-shadow:0 12px 32px rgba(99,102,241,0.58); }
        .na-cta:active { transform:scale(0.97); }
        .na-ghost { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); color:#94a3b8; border-radius:13px; font-weight:500; cursor:pointer; transition:all .15s; }
        .na-ghost:hover { color:#e2e8f0; border-color:rgba(255,255,255,0.2); }
        @media (max-width: 900px) { .na-intro-grid { grid-template-columns: 1fr !important; } .na-apply-anim { display:none !important; } }
      `}</style>
    </main>
  );
}

/* Animated "application auto-filling" illustration */
function ApplyAnimation() {
  const rows = [
    { label: "Full Name", delay: 0.2 },
    { label: "Email", delay: 0.9 },
    { label: "Experience", delay: 1.6 },
    { label: "Expected Salary", delay: 2.3 },
    { label: "Notice Period", delay: 3.0 },
  ];
  return (
    <motion.div className="na-apply-anim" initial={{ opacity: 0, scale: 0.92, x: 30 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={animFrame}>
      <div style={{ position: "absolute", inset: -1, borderRadius: 22, background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.4), transparent 60%)", filter: "blur(30px)", zIndex: -1 }} />
      <div style={animHeader}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ fontSize: 11.5, color: "#64748b", fontFamily: "monospace" }}>linkedin · easy apply</span>
      </div>
      <div style={{ padding: 22 }}>
        <p style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>Apply to Acme Corp</p>
        {rows.map((r) => (
          <div key={r.label} style={{ marginBottom: 12 }}>
            <span style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 5 }}>{r.label}</span>
            <div style={animField}>
              <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: r.delay, duration: 0.5, repeat: Infinity, repeatDelay: 3.5, repeatType: "loop" }}
                style={{ position: "absolute", inset: 0, background: "rgba(74,222,128,0.07)", borderRadius: 8 }} />
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: r.delay + 0.4, duration: 0.2, repeat: Infinity, repeatDelay: 3.8 }} style={animCheck}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </motion.span>
            </div>
          </div>
        ))}
      </div>
      {/* floating chat widget */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.4, duration: 0.5, repeat: Infinity, repeatDelay: 3.5 }} style={animChip}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} /> All 5 filled — you&rsquo;re good ✨
      </motion.div>
    </motion.div>
  );
}

function Arrow() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>; }
function UploadIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>; }

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" };
const introGrid: React.CSSProperties = { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 420px", gap: 56, alignItems: "center", maxWidth: 1100, width: "100%" };
const badge: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 100, padding: "6px 14px", fontSize: 12.5, color: "#94a3b8", fontWeight: 500, marginBottom: 22 };
const title: React.CSSProperties = { fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#f1f5f9", margin: 0 };
const gradientText: React.CSSProperties = { background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
const lead: React.CSSProperties = { color: "#94a3b8", fontSize: 16, lineHeight: 1.65, margin: "20px 0 0", maxWidth: 440 };
const checkChip: React.CSSProperties = { width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", flexShrink: 0 };
const chatWrap: React.CSSProperties = { position: "relative", zIndex: 1, width: "100%", maxWidth: 760 };
const uploadingCard: React.CSSProperties = { padding: "48px 36px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 24, display: "flex", flexDirection: "column", alignItems: "center" };
const reviewCheck: React.CSSProperties = { width: 60, height: 60, margin: "0 auto", borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", boxShadow: "0 0 28px rgba(74,222,128,0.3)" };
const reviewCard: React.CSSProperties = { background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: 24 };
const reviewGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 };
const reviewSkill: React.CSSProperties = { background: "rgba(99,102,241,0.14)", color: "#c7d2fe", border: "1px solid rgba(129,140,248,0.3)", padding: "4px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 500 };
const animFrame: React.CSSProperties = { position: "relative", background: "rgba(15,20,40,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" };
const animHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" };
const animField: React.CSSProperties = { position: "relative", height: 38, borderRadius: 9, border: "1px solid rgba(74,222,128,0.35)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center" };
const animCheck: React.CSSProperties = { position: "absolute", right: 12, display: "flex" };
const animChip: React.CSSProperties = { margin: "0 22px 20px", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(30,27,75,0.9)", border: "1px solid rgba(99,102,241,0.3)", color: "#4ade80", fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 12 };
