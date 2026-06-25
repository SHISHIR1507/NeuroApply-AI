"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const POINTS = [
  {
    title: "Runs in your own browser",
    body: "NeuroApply is a normal Chrome extension that works inside your real, logged-in browser — like you, just faster. No headless bots, no cloud sessions, no scraping servers.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
    ),
    accent: "#6366f1",
  },
  {
    title: "You're always in control",
    body: "It fills the form — you review every answer and click Submit yourself. NeuroApply never submits applications for you. Your decisions stay yours.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    ),
    accent: "#4ade80",
  },
  {
    title: "No mass automation",
    body: "It doesn't blast applications, auto-click jobs, or simulate activity at scale — the behavior platforms actually penalize. It only helps with the form that's already open in front of you.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" /><path d="M12 2v10" /></svg>
    ),
    accent: "#22d3ee",
  },
  {
    title: "Your data stays yours",
    body: "We never ask for or store your LinkedIn password. Your profile and resume are used only to fill your own applications — never sold, never shared.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
    accent: "#a78bfa",
  },
];

export default function Safety() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="safety" ref={ref} style={{ padding: "120px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 100, padding: "6px 15px", marginBottom: 22 }}>
          <ShieldIcon />
          <span style={{ fontSize: 13, color: "#86efac", fontWeight: 600 }}>Built to keep your account safe</span>
        </div>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px", background: "linear-gradient(135deg, #f1f5f9 0%, #86efac 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Safe by design — not by luck
        </h2>
        <p style={{ fontSize: 17, color: "#64748b", maxWidth: 640, margin: "0 auto", lineHeight: 1.65 }}>
          Account safety isn&rsquo;t an afterthought — it&rsquo;s the whole architecture. NeuroApply works the way a careful human does, which keeps you firmly in the safe zone.
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {POINTS.map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", overflow: "hidden", padding: 26, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, background: `radial-gradient(circle at top right, ${p.accent}12, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: `${p.accent}15`, border: `1px solid ${p.accent}30`, color: p.accent, marginBottom: 16 }}>{p.icon}</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-0.015em" }}>{p.title}</h3>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: 0 }}>{p.body}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.45, duration: 0.5 }}
        style={{ marginTop: 22, padding: "20px 26px", borderRadius: 16, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.05)", display: "flex", alignItems: "center", gap: 16, justifyContent: "center", textAlign: "center", flexWrap: "wrap" }}>
        <ShieldIcon size={22} />
        <span style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.6 }}>
          <b style={{ color: "#f1f5f9" }}>Bottom line:</b> because everything happens in your browser and <b style={{ color: "#86efac" }}>you</b> hit submit, you stay in the same low-risk category as someone applying by hand — just dramatically faster.
        </span>
      </motion.div>
    </section>
  );
}

function ShieldIcon({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>;
}
