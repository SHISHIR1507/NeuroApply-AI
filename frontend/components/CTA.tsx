"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AddToChromeBtn } from "./Navbar";

export default function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} style={{ padding: "80px 24px 140px", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}
      >
        <div style={{
          padding: "64px 48px",
          borderRadius: 28,
          border: "1px solid rgba(245,158,11,0.2)",
          background: "rgba(245,158,11,0.03)",
          backdropFilter: "blur(24px)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: 200, height: 200,
            background: "radial-gradient(circle at top left, rgba(245,158,11,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: 200, height: 200,
            background: "radial-gradient(circle at bottom right, rgba(34,211,238,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
              fontSize: 28,
            }}
          >
            🧠
          </motion.div>

          <h2 style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            lineHeight: 1.1,
            background: "linear-gradient(135deg, #fafafa 0%, #a1a1aa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Ready to apply smarter?
          </h2>

          <p style={{
            fontSize: 17, color: "#52525b", lineHeight: 1.65,
            maxWidth: 460, margin: "0 auto 36px",
          }}>
            Install NeuroApply AI, build your profile in 3 minutes, and never manually fill a job application again.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <AddToChromeBtn />
            <a href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 15, fontWeight: 500, color: "#71717a",
              textDecoration: "none",
              padding: "12px 22px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#fafafa";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.3)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "#71717a";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
            }}
            >
              Open dashboard →
            </a>
          </div>

          <p style={{ fontSize: 13, color: "#3f3f46", marginTop: 20 }}>
            Free · No account required to install · Works instantly
          </p>
        </div>
      </motion.div>
    </section>
  );
}
