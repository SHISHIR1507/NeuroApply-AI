"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import Aurora from "@/components/Aurora";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={wrap}>
      <Aurora />
      <div style={grid}>
        <ManualScene />

        {/* Center: the sign-in card */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={card}>
          <div style={glowOrb} aria-hidden />
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} style={logoRing}>
            <Image src="/logo.png" alt="NeuroApply" width={48} height={48} style={{ borderRadius: 12 }} />
          </motion.div>
          <h1 style={title}>Welcome back</h1>
          <p style={subtitle}>Sign in to your NeuroApply account</p>

          <form onSubmit={handleSubmit} style={form}>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="na-input" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="na-input" />
            </Field>
            {error && (
              <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 0] }} transition={{ duration: 0.4 }} style={errStyle}>{error}</motion.p>
            )}
            <button type="submit" disabled={loading} className="na-btn">{loading ? <span className="na-spin" /> : "Sign In"}</button>
          </form>

          <p style={footer}>No account? <Link href="/register" style={link}>Create one</Link></p>
        </motion.div>

        <AutoScene />
      </div>
      <AuthStyles />
      <style>{`@media (max-width: 1080px){ .na-side-scene { display:none !important; } .na-login-grid { grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}

/* ──────────────── Left: the painful manual way ──────────────── */
function ManualScene() {
  const rows = [0, 1, 2];
  return (
    <motion.div className="na-side-scene" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }} style={sceneCard("#f43f5e")}>
      <div style={sceneGlow("rgba(244,63,94,0.3)")} />
      <span style={sceneLabel("#fb7185", "rgba(244,63,94,0.12)", "rgba(244,63,94,0.3)")}>Without NeuroApply</span>

      <Face mood="sad" color="#fb7185" />
      <p style={sceneCaption}>Typing the same answers,<br />form after form…</p>

      <div style={miniForm}>
        {rows.map((i) => (
          <div key={i} style={miniRow}>
            <motion.div
              animate={{ width: ["0%", "70%", "70%", "0%"] }}
              transition={{ duration: 3.4, times: [0, 0.5, 0.75, 1], repeat: Infinity, delay: i * 0.5 }}
              style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)" }}
            />
            <motion.span
              animate={{ opacity: [0, 0, 1, 0], scale: [0.6, 0.6, 1, 0.8] }}
              transition={{ duration: 3.4, times: [0, 0.5, 0.62, 0.8], repeat: Infinity, delay: i * 0.5 }}
              style={crossMark}
            >✕</motion.span>
          </div>
        ))}
      </div>
      <span style={{ ...pill, color: "#fb7185", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}>😮‍💨 47 more to go…</span>
    </motion.div>
  );
}

/* ──────────────── Right: chilling while NeuroApply works ──────────────── */
function AutoScene() {
  const rows = [0, 1, 2];
  return (
    <motion.div className="na-side-scene" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }} style={sceneCard("#818cf8")}>
      <div style={sceneGlow("rgba(99,102,241,0.35)")} />
      <span style={sceneLabel("#a5b4fc", "rgba(99,102,241,0.14)", "rgba(129,140,248,0.3)")}>With NeuroApply</span>

      <Face mood="chill" color="#a5b4fc" />
      <p style={sceneCaption}>You relax — NeuroApply<br />fills them all for you.</p>

      <div style={miniForm}>
        {rows.map((i) => (
          <div key={i} style={miniRow}>
            <motion.div
              animate={{ width: ["0%", "100%", "100%", "0%"] }}
              transition={{ duration: 3.4, times: [0, 0.2, 0.85, 1], repeat: Infinity, delay: i * 0.18 }}
              style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg, #6366f1, #4ade80)" }}
            />
            <motion.span
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
              transition={{ duration: 3.4, times: [0, 0.28, 0.85, 1], repeat: Infinity, delay: i * 0.18 }}
              style={{ ...crossMark, color: "#4ade80" }}
            >✓</motion.span>
          </div>
        ))}
      </div>
      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }} style={{ ...pill, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>✨ All done — go chill</motion.span>
    </motion.div>
  );
}

/* A little face that conveys the mood */
function Face({ mood, color }: { mood: "sad" | "chill"; color: string }) {
  return (
    <div style={{ position: "relative" }}>
      {mood === "chill" && (
        <>
          <motion.span animate={{ y: [-2, -10, -2], opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 2.6, repeat: Infinity }} style={{ position: "absolute", top: -6, right: 6, fontSize: 13, color }}>z</motion.span>
          <motion.span animate={{ y: [-2, -12, -2], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.5 }} style={{ position: "absolute", top: -2, right: 18, fontSize: 10, color }}>z</motion.span>
        </>
      )}
      <motion.svg width="74" height="74" viewBox="0 0 74 74"
        animate={mood === "sad" ? { rotate: [0, -3, 3, 0] } : { y: [0, -3, 0] }}
        transition={{ duration: mood === "sad" ? 0.8 : 3, repeat: Infinity }}>
        <circle cx="37" cy="37" r="30" fill="none" stroke={color} strokeWidth="3" opacity="0.5" />
        <circle cx="28" cy="32" r="3.2" fill={color} />
        <circle cx="46" cy="32" r="3.2" fill={color} />
        {mood === "sad"
          ? <path d="M27 50 Q37 42 47 50" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          : <path d="M27 46 Q37 54 47 46" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />}
        {mood === "sad" && <motion.circle animate={{ cy: [40, 52], opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity }} cx="52" cy="40" r="2.5" fill="#60a5fa" />}
      </motion.svg>
    </div>
  );
}

/* shared exports used by register page */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7, textAlign: "left" }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: "#94a3b8" }}>{label}</span>
      {children}
    </label>
  );
}

export function AuthStyles() {
  return (
    <style>{`
      .na-input { width:100%; padding:12px 14px; font-size:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); border-radius:11px; color:#f1f5f9; outline:none; backdrop-filter:blur(12px); transition:border-color .2s, box-shadow .2s, background .2s; }
      .na-input::placeholder { color:#5b6678; }
      .na-input:focus { border-color:rgba(129,140,248,0.7); background:rgba(255,255,255,0.06); box-shadow:0 0 0 3px rgba(129,140,248,0.18), 0 0 22px rgba(129,140,248,0.22); }
      .na-btn { position:relative; overflow:hidden; width:100%; padding:13px; margin-top:4px; font-size:14px; font-weight:600; color:#fff; border:none; border-radius:11px; cursor:pointer; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 8px 24px rgba(99,102,241,0.42), inset 0 1px 0 rgba(255,255,255,0.22); transition:transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .25s, opacity .2s; display:flex; align-items:center; justify-content:center; min-height:46px; }
      .na-btn:hover { box-shadow:0 10px 30px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.28); }
      .na-btn:active { transform:scale(0.98); }
      .na-btn:disabled { opacity:.8; cursor:default; }
      .na-btn::after { content:''; position:absolute; top:0; left:-120%; width:80%; height:100%; background:linear-gradient(110deg, transparent, rgba(255,255,255,0.3), transparent); transform:skewX(-18deg); transition:left .6s ease; }
      .na-btn:hover::after { left:130%; }
      .na-spin { width:18px; height:18px; border-radius:50%; border:2px solid rgba(255,255,255,0.35); border-top-color:#fff; animation:na-rot .7s linear infinite; }
      @keyframes na-rot { to { transform:rotate(360deg); } }
    `}</style>
  );
}

/* styles */
const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" };
const grid: React.CSSProperties = { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 410px 1fr", gap: 36, alignItems: "center", maxWidth: 1180, width: "100%" };
const card: React.CSSProperties = { position: "relative", width: "100%", padding: "40px 36px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, boxShadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)", textAlign: "center", overflow: "hidden" };
const glowOrb: React.CSSProperties = { position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 260, height: 160, background: "radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)", filter: "blur(30px)", pointerEvents: "none" };
const logoRing: React.CSSProperties = { width: 72, height: 72, margin: "0 auto 20px", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.3)", boxShadow: "0 0 30px rgba(99,102,241,0.4)", position: "relative", zIndex: 1 };
const title: React.CSSProperties = { fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg, #f1f5f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
const subtitle: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "0 0 28px" };
const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const errStyle: React.CSSProperties = { color: "#fca5a5", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 9 };
const footer: React.CSSProperties = { color: "#64748b", fontSize: 13, marginTop: 22 };
const link: React.CSSProperties = { color: "#a78bfa", textDecoration: "none", fontWeight: 600 };

const sceneCard = (accent: string): React.CSSProperties => ({ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "32px 24px", background: "rgba(255,255,255,0.025)", backdropFilter: "blur(16px)", border: `1px solid ${accent}22`, borderRadius: 20 });
const sceneGlow = (c: string): React.CSSProperties => ({ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 200, height: 130, background: `radial-gradient(circle, ${c}, transparent 70%)`, filter: "blur(34px)", pointerEvents: "none" });
const sceneLabel = (color: string, bg: string, border: string): React.CSSProperties => ({ position: "relative", zIndex: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color, background: bg, border: `1px solid ${border}`, borderRadius: 100, padding: "5px 12px" });
const sceneCaption: React.CSSProperties = { color: "#94a3b8", fontSize: 13.5, lineHeight: 1.5, margin: 0 };
const miniForm: React.CSSProperties = { width: "100%", maxWidth: 200, display: "flex", flexDirection: "column", gap: 12, margin: "4px 0 6px" };
const miniRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };
const crossMark: React.CSSProperties = { marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#fb7185", display: "inline-flex" };
const pill: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 100 };
