"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  { icon: "⚡", text: "Fills LinkedIn Easy Apply in under 2 seconds" },
  { icon: "🧠", text: "Resume-aware — answers questions from your profile" },
  { icon: "🔒", text: "Never auto-submits — you stay in control" },
  { icon: "🎯", text: "ATS match score before you apply" },
  { icon: "↩",  text: "Manual edits saved and reused automatically" },
  { icon: "🆓", text: "100 % free — no account required to install" },
];

export default function Marquee() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % ITEMS.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const item = ITEMS[idx];

  return (
    <div style={{
      padding: "28px 24px",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>{item.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#d4d4d8" }}>{item.text}</span>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 5 }}>
        {ITEMS.map((_, i) => (
          <div key={i} style={{
            height: 3, borderRadius: 99,
            width: i === idx ? 20 : 5,
            background: i === idx ? "#f59e0b" : "rgba(255,255,255,0.1)",
            transition: "all 0.35s ease",
          }} />
        ))}
      </div>
    </div>
  );
}
