"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "Applied to 23 jobs in a single afternoon. Would've taken me all week manually.",
    name: "Rohan M.",
    role: "Software Engineer · Bangalore",
    avatar: "R",
    stat: "23 jobs",
    statLabel: "in one afternoon",
  },
  {
    quote: "Filled a 12-step Easy Apply form in under 5 seconds. The ATS score alone is worth installing.",
    name: "Priya K.",
    role: "Product Manager · Mumbai",
    avatar: "P",
    stat: "5 sec",
    statLabel: "12-step form",
  },
  {
    quote: "It remembered my notice period and salary from the first application. Never typed it again.",
    name: "Alex T.",
    role: "Data Analyst · Delhi",
    avatar: "A",
    stat: "0 retyping",
    statLabel: "saved answers",
  },
];

export default function SocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} style={{ padding: "0 24px 120px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 40 }}
      >
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 100, padding: "6px 16px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#86efac" }}>Real results from real users</span>
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: "26px 24px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18,
              display: "flex", flexDirection: "column", gap: 20,
              position: "relative", overflow: "hidden",
              transition: "border-color 0.3s, background 0.3s, transform 0.3s",
              cursor: "default",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(245,158,11,0.25)";
              el.style.background = "rgba(245,158,11,0.03)";
              el.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.07)";
              el.style.background = "rgba(255,255,255,0.02)";
              el.style.transform = "translateY(0)";
            }}
          >
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: 0, right: 0, width: 120, height: 120,
              background: "radial-gradient(circle at top right, rgba(245,158,11,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Stars */}
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>

            {/* Big stat */}
            <div>
              <div style={{
                fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                lineHeight: 1,
              }}>{t.stat}</div>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 500, marginTop: 3 }}>{t.statLabel}</div>
            </div>

            {/* Quote */}
            <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.7, margin: 0, fontStyle: "italic", flexGrow: 1 }}>
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #f59e0b40, #22d3ee40)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fbbf24",
              }}>{t.avatar}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#3f3f46" }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
