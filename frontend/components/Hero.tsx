"use client";

import { motion } from "framer-motion";
import { AddToChromeBtn } from "./Navbar";

const WORD_ANIM = {
  hidden: { opacity: 0, y: 32, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const words = ["Apply", "smarter.", "Not", "harder."];

const CHAT_MESSAGES = [
  { delay: 0.8, text: "On it! ⚡ Found <b>6 questions</b> to fill." },
  { delay: 1.4, text: '<span style="color:#4ade80">✓</span> Full Name · <span style="color:#4ade80">✓</span> Email' },
  { delay: 1.9, text: '<span style="color:#4ade80">✓</span> Years of Experience' },
  { delay: 2.3, text: '<span style="color:#4ade80">✓</span> Expected Salary · <span style="color:#4ade80">✓</span> Notice Period' },
  { delay: 2.8, text: "All <b>6</b> filled — you're good! ✨" },
];

export default function Hero() {
  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "120px 24px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Gradient blobs */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 600,
          background: "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", top: "10%", left: "10%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "5%",
          width: 350, height: 350,
          background: "radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }} />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 100, padding: "6px 14px", marginBottom: 32,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#4ade80",
          boxShadow: "0 0 8px #4ade80",
          animation: "pulse 2s infinite",
          display: "inline-block",
        }} />
        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
          Now live · LinkedIn Easy Apply
        </span>
      </motion.div>

      {/* Headline */}
      <h1 style={{
        fontSize: "clamp(48px, 7vw, 88px)",
        fontWeight: 800,
        lineHeight: 1.05,
        letterSpacing: "-0.04em",
        textAlign: "center",
        maxWidth: 900,
        margin: "0 0 8px",
      }}>
        {words.map((word, i) => (
          <motion.span
            key={word}
            custom={i}
            variants={WORD_ANIM}
            initial="hidden"
            animate="visible"
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              background: i < 2
                ? "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)"
                : "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >{word}</motion.span>
        ))}
      </h1>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{
          fontSize: "clamp(16px, 2vw, 20px)",
          color: "#64748b",
          textAlign: "center",
          maxWidth: 600,
          lineHeight: 1.65,
          margin: "20px 0 40px",
        }}
      >
        NeuroApply AI reads your profile once, then autofills every LinkedIn Easy Apply form — instantly, accurately, and with an AI chat guide walking you through.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.5 }}
        style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
      >
        <AddToChromeBtn />
        <a href="#demo" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 15, fontWeight: 500, color: "#94a3b8",
          textDecoration: "none",
          padding: "12px 20px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          transition: "all 0.2s",
          background: "rgba(255,255,255,0.02)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.4)";
          (e.currentTarget as HTMLElement).style.color = "#f1f5f9";
          (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.06)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
        }}
        >
          See how it works
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </motion.div>

      {/* Animated mockup */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginTop: 72, width: "100%", maxWidth: 820, position: "relative" }}
      >
        {/* Browser chrome frame */}
        <div style={{
          background: "rgba(15,20,40,0.8)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
        }}>
          {/* Browser bar */}
          <div style={{
            height: 44,
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
            <div style={{
              flex: 1, margin: "0 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6, height: 26,
              display: "flex", alignItems: "center", padding: "0 12px",
              fontSize: 12, color: "#475569",
              fontFamily: "monospace",
            }}>
              linkedin.com/jobs/easy-apply
            </div>
          </div>

          {/* Content area */}
          <div style={{
            position: "relative",
            padding: 32,
            minHeight: 340,
            background: "linear-gradient(180deg, rgba(10,15,35,0.9) 0%, rgba(5,8,20,0.95) 100%)",
          }}>
            {/* LinkedIn form mockup */}
            <LinkedInFormMockup />

            {/* Chat widget overlay */}
            <ChatWidgetMockup />
          </div>
        </div>

        {/* Glow beneath */}
        <div style={{
          position: "absolute",
          bottom: -30, left: "10%", right: "10%",
          height: 60,
          background: "rgba(99,102,241,0.3)",
          filter: "blur(40px)",
          borderRadius: "50%",
        }} />
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}

function LinkedInFormMockup() {
  const fields = [
    { label: "Full Name", value: "Shishir Singh", filled: true },
    { label: "Email", value: "shishir@proaibots.com", filled: true },
    { label: "Phone Number", value: "+91 98765 43210", filled: true },
    { label: "Years of Experience", value: "3", filled: true },
    { label: "Expected Salary (per annum)", value: "1200000", filled: true },
    { label: "Notice Period (days)", value: "30", filled: true },
  ];

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>
          Apply to Acme Corp
        </h3>
        <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Senior Frontend Engineer · Remote</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 + i * 0.1, duration: 0.4 }}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <label style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{f.label}</label>
            <div style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: f.filled ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.08)",
              background: f.filled ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)",
              fontSize: 13,
              color: f.filled ? "#e2e8f0" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: f.filled ? "0 0 0 3px rgba(74,222,128,0.06)" : "none",
              transition: "all 0.3s",
            }}>
              <span>{f.value || "—"}</span>
              {f.filled && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ChatWidgetMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        position: "absolute",
        bottom: 24, right: 24,
        width: 248,
        background: "#111827",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 16px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%", background: "#4ade80",
          boxShadow: "0 0 6px #4ade80",
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff" }}>NeuroApply</span>
      </div>

      {/* Messages */}
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {CHAT_MESSAGES.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: msg.delay, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              background: "#1e1b4b",
              border: "1px solid rgba(99,102,241,0.18)",
              borderRadius: "4px 14px 14px 14px",
              padding: "7px 11px",
              fontSize: 12,
              lineHeight: 1.55,
              color: "#e2e8f0",
            }}
            dangerouslySetInnerHTML={{ __html: msg.text }}
          />
        ))}
      </div>
    </motion.div>
  );
}
