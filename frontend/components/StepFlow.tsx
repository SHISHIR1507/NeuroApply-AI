"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

const STEPS = [
  {
    icon: "📄",
    label: "Build profile once",
    sub: "Takes 3 minutes",
    accent: "#f59e0b",
  },
  {
    icon: "🔍",
    label: "Browse LinkedIn",
    sub: "Click Easy Apply",
    accent: "#22d3ee",
  },
  {
    icon: "⚡",
    label: "Filled in 2 seconds",
    sub: "You hit Submit",
    accent: "#22c55e",
  },
];

export default function StepFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    // Stagger each step lighting up
    STEPS.forEach((_, i) => {
      setTimeout(() => setActive(i), 400 + i * 500);
    });
  }, [inView]);

  return (
    <div ref={ref} style={{
      maxWidth: 860, margin: "0 auto",
      padding: "0 24px 80px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {STEPS.map((step, i) => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
            {/* Pill */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              padding: "20px 28px", borderRadius: 16, flexShrink: 0,
              border: `1px solid ${i <= active ? step.accent + "50" : "rgba(255,255,255,0.07)"}`,
              background: i <= active ? step.accent + "08" : "rgba(255,255,255,0.02)",
              transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: i <= active ? "scale(1.02)" : "scale(1)",
              boxShadow: i <= active ? `0 0 28px ${step.accent}18` : "none",
              minWidth: 148,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: i <= active ? step.accent + "18" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i <= active ? step.accent + "30" : "rgba(255,255,255,0.06)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, transition: "all 0.5s ease",
              }}>{step.icon}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: i <= active ? step.accent : "#3f3f46",
                  transition: "color 0.5s",
                }}>{step.label}</div>
                <div style={{
                  fontSize: 11, marginTop: 3,
                  color: i <= active ? "#52525b" : "#27272a",
                  transition: "color 0.5s",
                }}>{step.sub}</div>
              </div>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 6px", marginBottom: 24,
                background: "rgba(255,255,255,0.05)", borderRadius: 99,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  background: `linear-gradient(90deg, ${STEPS[i].accent}, ${STEPS[i + 1].accent})`,
                  borderRadius: 99,
                  width: i < active ? "100%" : "0%",
                  transition: "width 0.6s ease 0.1s",
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
