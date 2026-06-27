"use client";

const tags = [
  { icon: "⚡", text: "Fills in 2 seconds" },
  { icon: "🔒", text: "Never auto-submits" },
  { icon: "🧠", text: "Resume-aware AI" },
  { icon: "✦",  text: "ATS score checker" },
  { icon: "↩",  text: "Manual override" },
  { icon: "📋", text: "Answer history" },
  { icon: "🔄", text: "Multi-step forms" },
  { icon: "📍", text: "LinkedIn Easy Apply" },
  { icon: "🎯", text: "Field-level accuracy" },
  { icon: "⚙️", text: "Works on page load" },
  { icon: "🆓", text: "100 % free forever" },
  { icon: "🛡️", text: "Safe by design" },
];

function Tag({ icon, text }: { icon: string; text: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "9px 20px",
      border: "1px solid rgba(245,158,11,0.2)",
      borderRadius: 100,
      background: "rgba(245,158,11,0.05)",
      fontSize: 13, fontWeight: 500,
      color: "#a1a1aa",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      {text}
    </span>
  );
}

export default function Marquee() {
  const double = [...tags, ...tags];

  return (
    <section style={{
      padding: "48px 0",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Fade left */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 140, zIndex: 2,
        background: "linear-gradient(to right, #07070a, transparent)",
        pointerEvents: "none",
      }} />
      {/* Fade right */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 140, zIndex: 2,
        background: "linear-gradient(to left, #07070a, transparent)",
        pointerEvents: "none",
      }} />

      {/* Row 1 — scrolls left */}
      <div style={{ display: "flex", marginBottom: 14, gap: 12, willChange: "transform" }}>
        <div style={{
          display: "flex", gap: 12, animation: "marquee-left 28s linear infinite",
          willChange: "transform",
        }}>
          {double.map((t, i) => <Tag key={i} {...t} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right, offset palette */}
      <div style={{ display: "flex", gap: 12, willChange: "transform" }}>
        <div style={{
          display: "flex", gap: 12, animation: "marquee-right 34s linear infinite",
          willChange: "transform",
        }}>
          {[...double].reverse().map((t, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 20px",
              border: "1px solid rgba(34,211,238,0.15)",
              borderRadius: 100,
              background: "rgba(34,211,238,0.04)",
              fontSize: 13, fontWeight: 500,
              color: "#71717a",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
