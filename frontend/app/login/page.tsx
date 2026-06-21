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

        {/* Center: the sign-in card — clearly the focal point */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={card}>
          <div style={glowOrb} aria-hidden />
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} style={logoRing}>
            <Image src="/logo.png" alt="NeuroApply" width={50} height={50} style={{ borderRadius: 12 }} />
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

/* ─────────── Left: a person drowning in manual forms ─────────── */
function ManualScene() {
  return (
    <motion.div className="na-side-scene" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.7 }} style={scene}>
      <span style={label("#fb7185")}>Without NeuroApply</span>

      <div style={stage}>
        {/* piling unfinished forms with red ✗ */}
        {[0, 1, 2].map((i) => (
          <motion.div key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [12, -2 - i * 3, -2 - i * 3, 12] }}
            transition={{ duration: 3.6, times: [0, 0.25, 0.8, 1], repeat: Infinity, delay: i * 0.45 }}
            style={{ ...jobCard, top: 6 + i * 4, left: 8 + i * 10, borderColor: "rgba(244,63,94,0.4)" }}>
            <span style={cardLine} /><span style={{ ...cardLine, width: "55%" }} />
            <span style={{ ...stamp, color: "#fb7185", borderColor: "rgba(244,63,94,0.5)" }}>✕</span>
          </motion.div>
        ))}
        <PersonWorking />
      </div>

      <p style={caption}>Typing the same answers,<br />form after form…</p>
      <span style={{ ...pill, color: "#fb7185", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}>😮‍💨 47 more to go</span>
    </motion.div>
  );
}

/* ─────────── Right: a person relaxing while it's handled ─────────── */
function AutoScene() {
  return (
    <motion.div className="na-side-scene" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.7 }} style={scene}>
      <span style={label("#a5b4fc")}>With NeuroApply</span>

      <div style={stage}>
        {/* completed forms with green ✓ floating away */}
        {[0, 1, 2].map((i) => (
          <motion.div key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, -6, -26, -46], scale: [0.9, 1, 1, 0.85] }}
            transition={{ duration: 3.2, times: [0, 0.3, 0.7, 1], repeat: Infinity, delay: i * 0.7 }}
            style={{ ...jobCard, top: 10, right: 10 + i * 6, borderColor: "rgba(74,222,128,0.4)" }}>
            <span style={{ ...cardLine, background: "rgba(74,222,128,0.5)" }} /><span style={{ ...cardLine, width: "55%", background: "rgba(74,222,128,0.4)" }} />
            <span style={{ ...stamp, color: "#4ade80", borderColor: "rgba(74,222,128,0.5)" }}>✓</span>
          </motion.div>
        ))}
        <PersonRelaxing />
      </div>

      <p style={caption}>You kick back — NeuroApply<br />fills them all for you.</p>
      <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} style={{ ...pill, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>✨ All done — go chill</motion.span>
    </motion.div>
  );
}

/* Hunched person typing at a laptop */
function PersonWorking() {
  return (
    <motion.svg width="150" height="130" viewBox="0 0 150 130" style={{ position: "relative", zIndex: 2 }}
      animate={{ rotate: [0, -1.5, 1.5, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
      <g stroke="#fb7185" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* desk */}
        <line x1="18" y1="104" x2="132" y2="104" />
        {/* chair back */}
        <path d="M104 104 V64 q0 -6 -6 -6" opacity="0.5" />
        {/* spine hunched forward */}
        <path d="M96 100 Q92 80 76 70" />
        {/* head down */}
        <circle cx="68" cy="62" r="11" fill="rgba(244,63,94,0.08)" />
        {/* arm reaching to laptop */}
        <path d="M80 72 Q66 78 54 86" />
        {/* thigh + shin */}
        <path d="M96 100 H72 M72 100 V116" />
        {/* laptop */}
        <path d="M40 100 h30 l-4 -16 h-22 z" fill="rgba(244,63,94,0.1)" />
        <line x1="48" y1="84" x2="62" y2="84" />
      </g>
      {/* sweat drop */}
      <motion.path d="M55 50 q3 5 0 8 q-3 -3 0 -8" fill="#60a5fa" stroke="none"
        animate={{ y: [0, 14], opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }} />
    </motion.svg>
  );
}

/* Person leaning back, hands behind head, relaxing */
function PersonRelaxing() {
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      {/* zzz */}
      <motion.span animate={{ y: [-2, -14, -2], opacity: [0.2, 0.9, 0.2] }} transition={{ duration: 2.6, repeat: Infinity }} style={{ position: "absolute", top: 6, left: 40, fontSize: 15, color: "#a5b4fc", fontWeight: 700 }}>z</motion.span>
      <motion.span animate={{ y: [-2, -16, -2], opacity: [0.15, 0.8, 0.15] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.5 }} style={{ position: "absolute", top: 12, left: 54, fontSize: 11, color: "#a5b4fc", fontWeight: 700 }}>z</motion.span>
      <motion.svg width="150" height="130" viewBox="0 0 150 130"
        animate={{ y: [0, -4, 0] }} transition={{ duration: 3.2, repeat: Infinity }}>
        <g stroke="#a5b4fc" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* ground */}
          <line x1="18" y1="110" x2="132" y2="110" opacity="0.4" />
          {/* reclined chair back */}
          <path d="M52 108 L34 70" opacity="0.5" />
          {/* reclined torso */}
          <path d="M92 102 Q66 96 46 74" />
          {/* head tilted back */}
          <circle cx="40" cy="64" r="11" fill="rgba(129,140,248,0.1)" />
          {/* arm bent behind head */}
          <path d="M48 74 Q40 60 52 56" />
          {/* legs crossed up */}
          <path d="M92 102 H118 M104 102 L120 92" />
        </g>
        {/* coffee cup */}
        <g stroke="#a5b4fc" strokeWidth="2.4" fill="none">
          <path d="M86 96 h14 v8 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 z" fill="rgba(129,140,248,0.12)" />
          <path d="M100 98 q5 0 5 4 t-5 4" />
        </g>
        <motion.path d="M90 88 q2 -4 0 -8" stroke="#a5b4fc" strokeWidth="2" fill="none" opacity="0.6"
          animate={{ y: [0, -6], opacity: [0, 0.6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
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
const grid: React.CSSProperties = { position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 420px 1fr", gap: 24, alignItems: "center", maxWidth: 1200, width: "100%" };

/* The sign-in card — elevated, glowing, clearly the focal point */
const card: React.CSSProperties = { position: "relative", zIndex: 3, width: "100%", padding: "44px 38px", background: "rgba(17,20,38,0.72)", backdropFilter: "blur(28px)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 24, boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(99,102,241,0.25)", textAlign: "center", overflow: "hidden" };
const glowOrb: React.CSSProperties = { position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)", width: 300, height: 180, background: "radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)", filter: "blur(34px)", pointerEvents: "none" };
const logoRing: React.CSSProperties = { width: 76, height: 76, margin: "0 auto 20px", borderRadius: 19, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,0.14)", border: "1px solid rgba(129,140,248,0.35)", boxShadow: "0 0 34px rgba(99,102,241,0.5)", position: "relative", zIndex: 1 };
const title: React.CSSProperties = { fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", background: "linear-gradient(135deg, #f1f5f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
const subtitle: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "0 0 28px" };
const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const errStyle: React.CSSProperties = { color: "#fca5a5", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 9 };
const footer: React.CSSProperties = { color: "#64748b", fontSize: 13, marginTop: 22 };
const link: React.CSSProperties = { color: "#a78bfa", textDecoration: "none", fontWeight: 600 };

/* Ambient side scenes — NO card chrome, so they don't compete with the form */
const scene: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16, opacity: 0.92 };
const label = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color, opacity: 0.9 });
const stage: React.CSSProperties = { position: "relative", width: 200, height: 150, display: "flex", alignItems: "flex-end", justifyContent: "center" };
const jobCard: React.CSSProperties = { position: "absolute", width: 78, padding: "8px 9px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid", display: "flex", flexDirection: "column", gap: 5, backdropFilter: "blur(4px)" };
const cardLine: React.CSSProperties = { height: 5, width: "100%", borderRadius: 3, background: "rgba(255,255,255,0.18)" };
const stamp: React.CSSProperties = { position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", border: "1.5px solid", background: "rgba(10,14,30,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 };
const caption: React.CSSProperties = { color: "#94a3b8", fontSize: 13.5, lineHeight: 1.5, margin: 0 };
const pill: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: "6px 13px", borderRadius: 100 };
