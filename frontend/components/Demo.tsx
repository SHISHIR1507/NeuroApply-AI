"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const PIPELINE = [
  { label: "Full Name", source: "profile", value: "Shishir Singh", baseMs: 2 },
  { label: "Email", source: "profile", value: "shishir.s@gmail.com", baseMs: 3 },
  { label: "Years of Experience", source: "default_rule", value: "3", baseMs: 1 },
  { label: "Expected Salary", source: "profile", value: "1200000", baseMs: 4 },
  { label: "Notice Period (days)", source: "history", value: "30", baseMs: 6 },
  { label: "Are you legally authorized?", source: "llm_infer", value: "Yes", baseMs: 312 },
];

// Small run-to-run jitter so re-running the pipeline shows real (if simulated)
// variance instead of replaying the exact same numbers every time.
function jitter(ms: number) {
  const factor = 0.82 + Math.random() * 0.36; // ±18%
  return Math.max(1, Math.round(ms * factor));
}

const SOURCE_COLORS: Record<string, string> = {
  profile: "#4ade80",
  history: "#60a5fa",
  default_rule: "#f59e0b",
  llm_infer: "#22d3ee",
  cache: "#34d399",
};

const SOURCE_LABELS: Record<string, string> = {
  profile: "Profile",
  history: "History",
  default_rule: "Rule",
  llm_infer: "AI",
  cache: "Cache",
};

export default function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState<number[]>([]);
  const [runTimes, setRunTimes] = useState<number[]>(PIPELINE.map(f => f.baseMs));

  const runDemo = () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setVisible([]);
    setRunTimes(PIPELINE.map(f => jitter(f.baseMs)));

    PIPELINE.forEach((_, i) => {
      setTimeout(() => {
        setVisible(v => [...v, i]);
        if (i === PIPELINE.length - 1) {
          setTimeout(() => { setRunning(false); setDone(true); }, 400);
        }
      }, 300 + i * 280);
    });
  };

  const reset = () => { setVisible([]); setDone(false); setRunning(false); };

  return (
    <section id="demo" ref={ref} style={{ padding: "120px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 64 }}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#f59e0b",
        }}>Live demo</span>
        <h2 style={{
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 800, letterSpacing: "-0.03em",
          margin: "12px 0 16px",
          background: "linear-gradient(135deg, #fafafa 0%, #71717a 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>See the resolution engine in action</h2>
        <p style={{ fontSize: 17, color: "#52525b", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
          Each field goes through a 6-layer pipeline. Most resolve in milliseconds.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {/* Terminal header */}
        <div style={{
          padding: "14px 20px",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 7 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          </div>
          <span style={{ fontSize: 12, color: "#52525b", fontFamily: "monospace" }}>
            NeuroApply · Field Resolution Engine
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              onClick={runDemo}
              disabled={running}
              style={{
                padding: "6px 16px", borderRadius: 8,
                background: running ? "rgba(245,158,11,0.15)" : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                color: "#07070a", border: "none", cursor: running ? "default" : "pointer",
                fontSize: 12, fontWeight: 600,
                transition: "opacity 0.2s",
                opacity: running ? 0.6 : 1,
              }}
            >
              {running ? "Resolving…" : done ? "Run again" : "▶ Run"}
            </button>
            {done && (
              <button onClick={reset} style={{
                padding: "6px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                color: "#64748b", border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", fontSize: 12,
              }}>Reset</button>
            )}
          </div>
        </div>

        {/* Resolution table */}
        <div style={{ padding: 24 }}>
          {/* Header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px minmax(0, 180px) 60px",
            gap: 16, padding: "0 8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 8,
          }}>
            {["Field", "Source", "Value", "Time"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ minHeight: 280 }}>
            <AnimatePresence>
              {PIPELINE.map((field, i) => (
                visible.includes(i) && (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px minmax(0, 180px) 60px",
                      gap: 16,
                      padding: "12px 8px",
                      borderRadius: 8,
                      transition: "background 0.2s",
                      alignItems: "center",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.label}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                        background: `${SOURCE_COLORS[field.source]}15`,
                        color: SOURCE_COLORS[field.source],
                        border: `1px solid ${SOURCE_COLORS[field.source]}30`,
                        whiteSpace: "nowrap",
                      }}>
                        {SOURCE_LABELS[field.source]}
                      </span>
                    </span>
                    <span
                      title={field.value}
                      style={{
                        fontSize: 13, color: "#94a3b8", fontFamily: "monospace",
                        minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {field.value}
                    </span>
                    <span style={{ fontSize: 12, color: runTimes[i] > 100 ? "#22d3ee" : "#4ade80", whiteSpace: "nowrap" }}>
                      {runTimes[i]}ms
                    </span>
                  </motion.div>
                )
              ))}
            </AnimatePresence>

            {visible.length === 0 && !running && (
              <div style={{
                height: 280, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#334155", fontSize: 14, flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: 28 }}>▶</div>
                Click Run to see the pipeline
              </div>
            )}
          </div>

          {/* Summary */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginTop: 16,
                  padding: "14px 20px",
                  borderRadius: 12,
                  background: "rgba(74,222,128,0.06)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>
                  All <strong style={{ color: "#fafafa" }}>6 fields</strong> resolved ·{" "}
                  <strong style={{ color: "#4ade80" }}>5 from cache/profile</strong> ·{" "}
                  <strong style={{ color: "#22d3ee" }}>1 via AI</strong>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexWrap: "wrap", gap: 16,
        }}>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SOURCE_COLORS[key] }} />
              <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
