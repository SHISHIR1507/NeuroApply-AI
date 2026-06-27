"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { value: "<2s",  label: "Average fill time"    },
  { value: "6",    label: "Resolution layers"     },
  { value: "1ms",  label: "Cached field latency"  },
  { value: "100%", label: "Easy Apply compatible" },
];

/* Rolls a single digit upward like a slot machine.
   Non-digit characters (< > % s m) just appear statically. */
function DigitRoller({ char, delay, active }: { char: string; delay: number; active: boolean }) {
  const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];
  const idx = DIGITS.indexOf(char);

  if (idx === -1) {
    // prefix / suffix — fade in
    return (
      <span style={{
        opacity: active ? 1 : 0,
        transition: `opacity 0.4s ease ${delay}ms`,
        display: "inline-block",
      }}>{char}</span>
    );
  }

  return (
    <span style={{
      display: "inline-block",
      overflow: "hidden",
      height: "1.1em",
      verticalAlign: "top",
    }}>
      <span style={{
        display: "flex",
        flexDirection: "column",
        lineHeight: "1.1em",
        /* Each digit = 10% of the 10-item column height.
           translateY(-idx*10%) shows the target digit. */
        transform: active ? `translateY(-${idx * 10}%)` : "translateY(0%)",
        transition: active
          ? `transform 0.9s cubic-bezier(0.34, 1.2, 0.64, 1) ${delay}ms`
          : "none",
      }}>
        {DIGITS.map(d => (
          <span key={d} style={{ display: "block", height: "1.1em" }}>{d}</span>
        ))}
      </span>
    </span>
  );
}

function OdometerValue({ value, active }: { value: string; active: boolean }) {
  return (
    <div style={{
      fontSize: "clamp(32px, 4vw, 48px)",
      fontWeight: 800, letterSpacing: "-0.04em",
      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      lineHeight: 1, marginBottom: 8,
      display: "flex", justifyContent: "center", alignItems: "baseline",
    }}>
      {value.split("").map((char, i) => (
        <DigitRoller key={i} char={char} delay={i * 80} active={active} />
      ))}
    </div>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 20, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{
              padding: "36px 32px",
              background: "rgba(255,255,255,0.015)",
              textAlign: "center",
              borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <OdometerValue value={s.value} active={inView} />
            <div style={{ fontSize: 13, color: "#52525b", fontWeight: 500 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
