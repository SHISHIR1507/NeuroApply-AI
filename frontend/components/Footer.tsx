"use client";

import RaiseIssue from "./RaiseIssue";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "40px 24px",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>N</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
            NeuroApply AI
          </span>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "GitHub", href: "https://github.com/SHISHIR1507/NeuroApply-AI" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Privacy", href: "#" },
          ].map(l => (
            <a key={l.label} href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{ fontSize: 13, color: "#334155", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
              onMouseLeave={e => (e.currentTarget.style.color = "#334155")}
            >{l.label}</a>
          ))}
          <RaiseIssue variant="link" />
        </div>

        <span style={{ fontSize: 12, color: "#1e293b" }}>
          © {new Date().getFullYear()} NeuroApply AI
        </span>
      </div>
    </footer>
  );
}
