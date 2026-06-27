"use client";

import { useRef, useState } from "react";
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
  },
  {
    title: "ATS score checker",
    description: "Paste a JD and get a live circular match score with keyword chips — before you apply.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    accent: "#22c55e",
  },
  {
    title: "Learns from you",
    description: "Every correction you make is saved and reused automatically across all future applications.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    accent: "#22d3ee",
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
  },
  {
    title: "Lightning cache",
    description: "First fill uses AI. Every repeat is served from local cache — under 1 ms.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "#f59e0b",
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

      {/*
        Bento layout — explicit grid areas so nothing ever orphans:
        Row 1: [A — 1 col] [B — 1 col] [C — 1 col]
        Row 2: [D — 2 col      ] [E — 1 col]
        Row 3: [F — 3 col               ]
      */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateAreas: `
          "a b c"
          "d d e"
          "f f f"
        `,
        gap: 16,
      }}>
        {[
          { feature: features[0], area: "a" },
          { feature: features[1], area: "b" },
          { feature: features[2], area: "c" },
          { feature: features[3], area: "d", wide: true },
          { feature: features[4], area: "e" },
          { feature: features[5], area: "f", full: true },
        ].map(({ feature, area, wide, full }, i) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            index={i}
            inView={inView}
            style={{ gridArea: area }}
            wide={wide}
            full={full}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 700px) {
          #features > div:last-child {
            grid-template-columns: 1fr !important;
            grid-template-areas: "a" "b" "c" "d" "e" "f" !important;
          }
        }
      `}</style>
    </section>
  );
}

function FeatureCard({ feature, index, inView, style, wide, full }: {
  feature: typeof features[0];
  index: number;
  inView: boolean;
  style?: React.CSSProperties;
  wide?: boolean;
  full?: boolean;
}) {
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, visible: false });
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpotlight({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSpotlight(s => ({ ...s, visible: false }))}
      style={{
        ...style,
        padding: full ? "28px 36px" : "28px",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s",
        cursor: "default",
        display: "flex",
        flexDirection: full ? "row" : "column",
        alignItems: full ? "center" : "flex-start",
        gap: full ? 24 : 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${feature.accent}40`;
        el.style.background = `${feature.accent}06`;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 20px 56px rgba(0,0,0,0.35)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.background = "rgba(255,255,255,0.02)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Cursor spotlight */}
      <div style={{
        position: "absolute",
        left: spotlight.x - 80, top: spotlight.y - 80,
        width: 160, height: 160,
        background: `radial-gradient(circle, ${feature.accent}20 0%, transparent 70%)`,
        borderRadius: "50%",
        pointerEvents: "none",
        opacity: spotlight.visible ? 1 : 0,
        transition: "opacity 0.2s",
      }} />

      {/* Corner glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 160, height: 160,
        background: `radial-gradient(circle at top right, ${feature.accent}12 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: `${feature.accent}15`,
        border: `1px solid ${feature.accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: feature.accent,
        marginBottom: full ? 0 : 18,
      }}>
        {feature.icon}
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fafafa", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.65, margin: 0 }}>
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}
