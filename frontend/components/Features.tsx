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
    accent: "#6366f1",
  },
  {
    title: "AI chat widget",
    description: "A live chat overlay guides you through each step — shows field status, resolves ambiguity, and stays out of your way.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    accent: "#8b5cf6",
  },
  {
    title: "Learns from you",
    description: "Corrected a field? That correction is saved and reused across all future applications automatically.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    accent: "#4ade80",
  },
  {
    title: "Multi-step forms",
    description: "Click Next and fields auto-fill on every step. NeuroApply detects page changes and refills in real time.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    accent: "#f59e0b",
  },
  {
    title: "Lightning fast cache",
    description: "First fill uses AI. Every repeat application is served from local cache — answers return in under 1ms.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "#06b6d4",
  },
  {
    title: "Manual fill button",
    description: 'Extension not auto-detecting? Hit "Fill this page" in the popup for an instant override that works every time.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    accent: "#f43f5e",
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
          textTransform: "uppercase", color: "#6366f1",
        }}>Features</span>
        <h2 style={{
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 800, letterSpacing: "-0.03em",
          margin: "12px 0 16px",
          background: "linear-gradient(135deg, #f1f5f9 0%, #64748b 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Everything you need. Nothing you don't.
        </h2>
        <p style={{ fontSize: 17, color: "#475569", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
          Built for speed, reliability, and the specific hell of LinkedIn Easy Apply forms.
        </p>
      </motion.div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {features.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} inView={inView} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature, index, inView }: {
  feature: typeof features[0]; index: number; inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: 28,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s",
        cursor: "default",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${feature.accent}35`;
        el.style.background = `${feature.accent}05`;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.07)";
        el.style.background = "rgba(255,255,255,0.02)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${feature.accent}12 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${feature.accent}15`,
        border: `1px solid ${feature.accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: feature.accent, marginBottom: 18,
      }}>
        {feature.icon}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
        {feature.title}
      </h3>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: 0 }}>
        {feature.description}
      </p>
    </motion.div>
  );
}
