"use client";

import { motion } from "framer-motion";
import { AddToChromeBtn } from "./Navbar";

/* ─── word-by-word reveal ─── */
const words = [
  { text: "Fill",          accent: false },
  { text: "applications",  accent: false },
  { text: "in",            accent: false },
  { text: "2 seconds.",    accent: true  },
];

export default function Hero() {
  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "128px 24px 80px",
      position: "relative", overflow: "hidden",
    }}>
      {/* ── Ambient background ── */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Amber blob top-center */}
        <div style={{
          position: "absolute", top: "-10%", left: "40%",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(245,158,11,0.13) 0%, transparent 68%)",
          filter: "blur(48px)",
          animation: "blob-drift 18s ease-in-out infinite",
        }} />
        {/* Cyan blob top-right */}
        <div style={{
          position: "absolute", top: "5%", right: "5%",
          width: 420, height: 420,
          background: "radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%)",
          filter: "blur(56px)",
          animation: "blob-drift 22s ease-in-out infinite 4s",
        }} />
        {/* Amber blob left */}
        <div style={{
          position: "absolute", top: "30%", left: "0%",
          width: 360, height: 360,
          background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "blob-drift 26s ease-in-out infinite 8s",
        }} />
        {/* Subtle dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)",
        }} />
      </div>

      {/* ── Badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.28)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 36,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#22c55e", boxShadow: "0 0 8px #22c55e",
          display: "inline-block", animation: "pulse-dot 2s infinite",
        }} />
        <span style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>
          Live · LinkedIn Easy Apply · 100 % free
        </span>
      </motion.div>

      {/* ── Headline ── */}
      <h1 style={{
        fontSize: "clamp(44px, 6.5vw, 84px)",
        fontWeight: 800, lineHeight: 1.05,
        letterSpacing: "-0.04em",
        textAlign: "center", maxWidth: 860, margin: "0 0 6px",
      }}>
        {words.map((w, i) => (
          <motion.span
            key={w.text}
            initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              background: w.accent
                ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #fde68a 100%)"
                : "linear-gradient(135deg, #fafafa 0%, #a1a1aa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >{w.text}</motion.span>
        ))}
      </h1>

      {/* ── Sub headline ── */}
      <motion.p
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.55 }}
        style={{
          fontSize: "clamp(16px, 1.8vw, 19px)",
          color: "#71717a", textAlign: "center",
          maxWidth: 580, lineHeight: 1.7, margin: "22px 0 44px",
        }}
      >
        NeuroApply AI reads your resume once and fills every LinkedIn Easy Apply form
        in under 2 seconds — accurate, safe, and completely in your control.
      </motion.p>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.5 }}
        style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
      >
        <AddToChromeBtn />
        <a href="#demo" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 15, fontWeight: 500, color: "#a1a1aa",
          textDecoration: "none", padding: "13px 22px",
          borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.35)";
          (e.currentTarget as HTMLElement).style.color = "#fafafa";
          (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.05)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
          (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        }}
        >
          Watch demo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </motion.div>

      {/* ── Floating screenshot cluster ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        style={{
          marginTop: 64, width: "100%", maxWidth: 980,
          position: "relative",
        }}
      >
        {/* Glow beneath */}
        <div style={{
          position: "absolute",
          bottom: -20, left: "10%", right: "10%", height: 80,
          background: "radial-gradient(ellipse, rgba(245,158,11,0.22) 0%, transparent 70%)",
          filter: "blur(32px)", pointerEvents: "none", zIndex: 0,
        }} />

        {/* Flex row — no absolute positioning, no clipping */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 20,
          padding: "0 16px 40px",
        }}>
          {/* Card 1 — Form autofill (raised by 40px via marginTop offset) */}
          <div style={{
            marginTop: 40, flexShrink: 0,
            animation: "float-a 5.5s ease-in-out infinite",
            zIndex: 2, position: "relative",
          }}>
            <FormCard />
          </div>

          {/* Card 2 — Extension popup (top-most) */}
          <div style={{
            marginTop: 0, flexShrink: 0,
            animation: "float-b 6.5s ease-in-out infinite 1.1s",
            zIndex: 3, position: "relative",
          }}>
            <PopupCard />
          </div>

          {/* Card 3 — ATS score (slightly lower) */}
          <div style={{
            marginTop: 80, flexShrink: 0,
            animation: "float-c 5s ease-in-out infinite 2.2s",
            zIndex: 2, position: "relative",
          }}>
            <ATSCard />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Screenshot mockup: LinkedIn form with green-filled fields ─── */
function FormCard() {
  const fields = [
    { label: "First name",   value: "Shishir",              ok: true },
    { label: "Last name",    value: "Singh",                ok: true },
    { label: "Email",        value: "singhshishir@...",     ok: true },
    { label: "Phone",        value: "+91 77240 73214",      ok: true },
    { label: "City",         value: "",                     ok: false },
  ];
  return (
    <div style={{
      width: 310,
      background: "rgba(10,10,14,0.92)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
      backdropFilter: "blur(20px)",
    }}>
      {/* Browser chrome */}
      <div style={{
        height: 38, background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 6,
      }}>
        {["#ff5f57","#febc2e","#28c840"].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <div style={{
          flex: 1, marginLeft: 10, height: 22, borderRadius: 5,
          background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center",
          padding: "0 10px", fontSize: 10, color: "#52525b", fontFamily: "monospace",
        }}>linkedin.com · Apply to EZSpace</div>
      </div>
      {/* Form body */}
      <div style={{ padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fafafa", margin: "0 0 4px" }}>Apply to EZSpace Ventures</p>
        <p style={{ fontSize: 11, color: "#52525b", margin: "0 0 16px" }}>Software Engineer · Remote</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {fields.map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: "#71717a", marginBottom: 3, fontWeight: 500 }}>{f.label}</div>
              <div style={{
                padding: "7px 10px", borderRadius: 7,
                border: f.ok ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.08)",
                background: f.ok ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                fontSize: 12, color: f.ok ? "#d4d4d8" : "#52525b",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: f.ok ? "0 0 0 3px rgba(34,197,94,0.05)" : "none",
              }}>
                <span>{f.value || "Enter city or location"}</span>
                {f.ok && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: "9px 0",
          background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
          borderRadius: 8, textAlign: "center",
          fontSize: 12, fontWeight: 700, color: "#07070a",
          boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
        }}>Next →</div>
      </div>
    </div>
  );
}

/* ─── Screenshot mockup: Extension popup ─── */
function PopupCard() {
  const items = [
    { icon: "✦", text: "No Easy Apply modal found", accent: false, bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    { icon: "◎", text: "Score this job (ATS)",       accent: true,  bg: "rgba(34,211,238,0.08)", color: "#22d3ee" },
    { icon: "⊞", text: "Open Dashboard",             accent: false, bg: "rgba(255,255,255,0.04)", color: "#a1a1aa" },
    { icon: "◈", text: "Set up AI profile",          accent: false, bg: "rgba(255,255,255,0.04)", color: "#a1a1aa" },
  ];
  return (
    <div style={{
      width: 280,
      background: "rgba(10,10,14,0.96)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(34,211,238,0.06) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#07070a",
          }}>N</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fafafa" }}>NeuroApply AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Connected</span>
        </div>
      </div>

      {/* Account */}
      <div style={{
        margin: "12px 12px 0",
        padding: "8px 12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b, #22d3ee)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#07070a",
        }}>S</div>
        <div>
          <div style={{ fontSize: 10, color: "#71717a" }}>Signed in as</div>
          <div style={{ fontSize: 11, color: "#fafafa", fontWeight: 600 }}>shishirsingh@gmail.com</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(it => (
          <div key={it.text} style={{
            padding: "9px 12px", borderRadius: 9,
            background: it.bg,
            border: `1px solid ${it.color}22`,
            fontSize: 12, color: it.color, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          }}>
            <span style={{ fontSize: 14 }}>{it.icon}</span>
            {it.text}
          </div>
        ))}
      </div>

      {/* Resume */}
      <div style={{
        margin: "0 12px 12px",
        padding: "8px 12px",
        background: "rgba(34,197,94,0.06)",
        border: "1px solid rgba(34,197,94,0.18)",
        borderRadius: 9, fontSize: 11,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>Software Developer - Shishir.pdf</span>
      </div>

      {/* Toggle row */}
      <div style={{
        margin: "0 12px 14px",
        padding: "8px 12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#d4d4d8" }}>Auto-advance steps</div>
          <div style={{ fontSize: 9, color: "#52525b" }}>Clicks "Next" — never submits</div>
        </div>
        <div style={{
          width: 36, height: 20, borderRadius: 99,
          background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
          position: "relative", boxShadow: "0 0 10px rgba(245,158,11,0.4)",
        }}>
          <div style={{
            position: "absolute", right: 3, top: 3,
            width: 14, height: 14, borderRadius: "50%", background: "#07070a",
          }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Screenshot mockup: ATS circular score card ─── */
function ATSCard() {
  const score = 82;
  const R = 36;
  const circ = +(2 * Math.PI * R).toFixed(2);
  const offset = circ * (1 - score / 100);

  return (
    <div style={{
      width: 230,
      background: "rgba(10,10,14,0.96)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 28px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      <div style={{ padding: "12px 14px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f59e0b" }}>
          ATS Match Score
        </span>
        <span style={{ fontSize: 9, color: "#52525b" }}>ten8labs.ai</span>
      </div>

      <div style={{ padding: "10px 14px 6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Ring */}
        <div style={{ position: "relative", width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 100 100" width="92" height="92">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={R} fill="none"
              stroke="#22c55e" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34,1.1,0.64,1)" }}
            />
          </svg>
          <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#22c55e" }}>{score}</span>
            <span style={{ fontSize: 10, color: "#52525b", fontWeight: 500 }}>/100</span>
          </div>
        </div>

        <p style={{ fontSize: 10.5, color: "#71717a", textAlign: "center", margin: "8px 0 10px", lineHeight: 1.5 }}>
          Strong match — likely to pass ATS screening
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 6 }}>
          {["React","FastAPI","Python","REST"].map(k => (
            <span key={k} style={{
              fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)",
            }}>{k}</span>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 14 }}>
          {["Docker","Kubernetes"].map(k => (
            <span key={k} style={{
              fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)",
            }}>{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
