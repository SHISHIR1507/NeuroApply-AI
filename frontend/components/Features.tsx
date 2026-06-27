"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    title: "Instant autofill",
    description: "Fills all fields the moment Easy Apply opens — no clicks, no waiting, no copy-paste.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    accent: "#f59e0b",
    span: "col",
  },
  {
    title: "ATS score checker",
    description: "Paste a JD and see a live circular match score with missing-keyword chips — before you apply.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    accent: "#22c55e",
    span: "col",
  },
  {
    title: "Learns from you",
    description: "Every correction you make is saved and automatically reused across all future applications. The more you use it, the sharper it gets.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    accent: "#22d3ee",
    span: "row",
  },
  {
    title: "Multi-step forms",
    description: "Detects page changes and refills on every step, including the Review page.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    accent: "#fbbf24",
    span: "col",
  },
  {
    title: "Lightning cache",
    description: "First fill uses AI. Every repeat is served locally — under 1 ms.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "#f59e0b",
    span: "col",
  },
  {
    title: "Never auto-submits",
    description: "NeuroApply fills fields and advances steps. You always hit the final Submit yourself. Hard constraint, not a setting.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    accent: "#22c55e",
    span: "row",
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} style={{
      padding: "120px 24px",
      maxWidth: 1100,
      margin: "0 auto",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 64 }}
      >
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#f59e0b",
        }}>Features</span>
        <h2 style={{
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 800, letterSpacing: "-0.03em",
          margin: "12px 0 16px",
          background: "linear-gradient(135deg, #fafafa 0%, #71717a 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Everything you need. Nothing you don't.
        </h2>
        <p style={{ fontSize: 17, color: "#52525b", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
          Built for speed, reliability, and the specific hell of LinkedIn Easy Apply forms.
        </p>
      </motion.div>

      {/* Bento grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "auto auto",
        gap: 16,
      }}>
        {/* Row 1: col | col | row (wide) */}
        {[0,1].map(i => (
          <FeatureCard key={features[i].title} feature={features[i]} index={i} inView={inView} />
        ))}
        {/* "Learns from you" spans 1 col but gets taller treatment */}
        <FeatureCard key={features[2].title} feature={features[2]} index={2} inView={inView} tall />

        {/* Row 2: wide | col | col */}
        <FeatureCard key={features[5].title} feature={features[5]} index={5} inView={inView} wide />
        {[3,4].map(i => (
          <FeatureCard key={features[i].title} feature={features[i]} index={i} inView={inView} />
        ))}
      </div>

      <style>{`
        @media (max-width: 700px) {
          #features > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function FeatureCard({ feature, index, inView, wide = false, tall = false }: {
  feature: typeof features[0]; index: number; inView: boolean; wide?: boolean; tall?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        gridColumn: wide ? "span 2" : undefined,
        padding: wide ? "32px 36px" : tall ? "32px 28px" : "28px",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s",
        cursor: "default",
        display: "flex",
        flexDirection: wide ? "row" : "column",
        gap: wide ? 28 : 0,
        alignItems: wide ? "center" : "flex-start",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${feature.accent}40`;
        el.style.background = `${feature.accent}06`;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 20px 56px rgba(0,0,0,0.35)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.background = "rgba(255,255,255,0.02)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 160, height: 160,
        background: `radial-gradient(circle at top right, ${feature.accent}12 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 13,
        background: `${feature.accent}15`,
        border: `1px solid ${feature.accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: feature.accent,
        flexShrink: 0,
        marginBottom: wide ? 0 : 18,
      }}>
        {feature.icon}
      </div>

      <div>
        <h3 style={{ fontSize: wide ? 19 : 16, fontWeight: 700, color: "#fafafa", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: wide ? 15 : 14, color: "#52525b", lineHeight: 1.65, margin: 0 }}>
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}
