"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const CATEGORIES = ["Bug", "Feature request", "Account / billing", "Other"];

export default function RaiseIssue({ variant = "button" }: { variant?: "button" | "link" }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Bug");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErr("");
    try {
      await api.raiseIssue({ name, email, category, message });
      setState("sent");
      setTimeout(() => { setOpen(false); reset(); }, 1800);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Couldn't send. Email singhshishir4727@gmail.com.");
      setState("error");
    }
  }
  function reset() { setName(""); setEmail(""); setMessage(""); setCategory("Bug"); setState("idle"); setErr(""); }

  return (
    <>
      {variant === "button" ? (
        <button onClick={() => setOpen(true)} style={triggerBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(129,140,248,0.5)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}>
          <BugIcon /> Raise an issue
        </button>
      ) : (
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#334155", fontSize: 13, cursor: "pointer", padding: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#334155")}>
          Raise an issue
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} style={overlay}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onClick={(e) => e.stopPropagation()} style={modal}>
              <div style={{ position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)", width: 200, height: 120, background: "radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)", filter: "blur(28px)", pointerEvents: "none" }} />

              {state === "sent" ? (
                <div style={{ textAlign: "center", padding: "30px 8px" }}>
                  <div style={sentCheck}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
                  <h3 style={{ color: "#f1f5f9", fontSize: 19, fontWeight: 700, margin: "16px 0 6px" }}>Thanks — we got it!</h3>
                  <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>We&rsquo;ll look into it and get back to you.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <h3 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>Raise an issue</h3>
                    <button onClick={() => setOpen(false)} style={closeBtn}>×</button>
                  </div>
                  <p style={{ color: "#64748b", fontSize: 13.5, margin: "0 0 20px" }}>Found a bug or have an idea? Tell us — it goes straight to the team.</p>

                  <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="na-ri-input" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (so we can reply)" className="na-ri-input" />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {CATEGORIES.map((c) => (
                        <button type="button" key={c} onClick={() => setCategory(c)}
                          style={{ ...catChip, ...(category === c ? catChipActive : {}) }}>{c}</button>
                      ))}
                    </div>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={5} rows={4}
                      placeholder="Describe what happened or what you'd like…" className="na-ri-input" style={{ resize: "vertical", minHeight: 96 }} />
                    {state === "error" && <p style={{ color: "#fca5a5", fontSize: 12.5, margin: 0 }}>{err}</p>}
                    <button type="submit" disabled={state === "sending" || message.trim().length < 5} className="na-ri-submit">
                      {state === "sending" ? "Sending…" : "Send report"}
                    </button>
                  </form>
                </>
              )}

              <style>{`
                .na-ri-input { flex:1; width:100%; padding:11px 13px; font-size:14px; background:rgba(255,255,255,0.04);
                  border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#f1f5f9; outline:none; font-family:inherit;
                  transition:border-color .2s, box-shadow .2s; }
                .na-ri-input::placeholder { color:#5b6678; }
                .na-ri-input:focus { border-color:rgba(129,140,248,0.6); box-shadow:0 0 0 3px rgba(129,140,248,0.15); }
                .na-ri-submit { width:100%; padding:12px; font-size:14px; font-weight:600; color:#fff; border:none; border-radius:11px;
                  cursor:pointer; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 8px 22px rgba(99,102,241,0.4);
                  transition:transform .15s, box-shadow .25s, opacity .2s; }
                .na-ri-submit:hover { box-shadow:0 10px 28px rgba(99,102,241,0.55); }
                .na-ri-submit:active { transform:scale(0.98); }
                .na-ri-submit:disabled { opacity:.55; cursor:default; }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BugIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="6" width="8" height="14" rx="4" /><path d="M19 7l-3 2M5 7l3 2M3 13h3M18 13h3M19 19l-3-2M5 19l3-2M12 2v4" /></svg>; }

const triggerBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: 13.5, fontWeight: 500, padding: "9px 16px", borderRadius: 11, cursor: "pointer", transition: "all .2s" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,6,18,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modal: React.CSSProperties = { position: "relative", overflow: "hidden", width: "100%", maxWidth: 460, padding: "28px 26px", background: "rgba(17,20,38,0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(129,140,248,0.22)", borderRadius: 22, boxShadow: "0 40px 100px rgba(0,0,0,0.6)" };
const closeBtn: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 28, height: 28, borderRadius: 8, fontSize: 18, cursor: "pointer", lineHeight: 1 };
const catChip: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 12.5, padding: "6px 12px", borderRadius: 9, cursor: "pointer", transition: "all .15s" };
const catChipActive: React.CSSProperties = { background: "rgba(99,102,241,0.18)", border: "1px solid rgba(129,140,248,0.45)", color: "#c7d2fe" };
const sentCheck: React.CSSProperties = { width: 56, height: 56, margin: "0 auto", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" };
