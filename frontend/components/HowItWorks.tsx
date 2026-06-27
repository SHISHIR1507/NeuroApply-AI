"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Build your profile once",
    description: "Answer a guided chat that builds your profile — name, skills, salary, notice period, work authorization. Takes 3 minutes.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: "#f59e0b",
  },
  {
    number: "02",
    title: "Browse jobs on LinkedIn",
    description: "Open any job and click Easy Apply. NeuroApply detects the modal the instant it opens — no button clicks, no setup.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    color: "#22d3ee",
  },
  {
    number: "03",
    title: "Watch it fill everything",
    description: "Fields autofill in under 2 seconds. Review the ATS match score, tweak anything you want, then hit Submit yourself.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    color: "#22c55e",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} style={{
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
        }}>How it works</span>
        <h2 style={{
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 800, letterSpacing: "-0.03em",
          margin: "12px 0 16px",
          background: "linear-gradient(135deg, #fafafa 0%, #71717a 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Three steps. Zero friction.
        </h2>
        <p style={{ fontSize: 17, color: "#52525b", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          From profile to submitted application in seconds — not hours.
        </p>
      </motion.div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 24,
        position: "relative",
      }}>
        {/* Connector line */}
        <div style={{
          position: "absolute",
          top: 56, left: "16%", right: "16%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.25) 20%, rgba(34,211,238,0.25) 80%, transparent)",
          pointerEvents: "none",
        }} className="hide-mobile" />

        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              padding: 32,
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.3s, background 0.3s, transform 0.3s",
              cursor: "default",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${step.color}40`;
              (e.currentTarget as HTMLElement).style.background = `${step.color}06`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, width: 180, height: 180,
              background: `radial-gradient(circle at top left, ${step.color}14 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />

            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              color: step.color, marginBottom: 20, opacity: 0.7,
            }}>{step.number}</div>

            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${step.color}15`,
              border: `1px solid ${step.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: step.color, marginBottom: 20,
            }}>
              {step.icon}
            </div>

            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#fafafa", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              {step.title}
            </h3>
            <p style={{ fontSize: 14.5, color: "#52525b", lineHeight: 1.65, margin: 0 }}>
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) { .hide-mobile { display: none !important; } }
      `}</style>
    </section>
  );
}
