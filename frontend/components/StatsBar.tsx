"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { value: "<2s",  label: "Average fill time"    },
  { value: "6",    label: "Resolution layers"     },
  { value: "1ms",  label: "Cached field latency"  },
  { value: "100%", label: "Easy Apply compatible" },
];

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
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.12 + 0.1, duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 800, letterSpacing: "-0.04em",
                color: "#f59e0b",
                lineHeight: 1, marginBottom: 10,
              }}
            >
              {s.value}
            </motion.div>
            <div style={{ fontSize: 13, color: "#52525b", fontWeight: 500, position: "relative" }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
