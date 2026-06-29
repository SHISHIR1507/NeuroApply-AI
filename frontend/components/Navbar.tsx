"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features",     href: "#features"    },
  { label: "Demo",         href: "#demo"        },
  { label: "Safety",       href: "#safety"      },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        background:    scrolled ? "rgba(7,7,10,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)"        : "none",
        borderBottom:  scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
      }}
    >
      <nav style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#07070a",
            boxShadow: "0 0 16px rgba(245,158,11,0.35)",
          }}>N</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.01em" }}>
            NeuroApply <span style={{ color: "#f59e0b" }}>AI</span>
          </span>
        </a>

        {/* Desktop nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hide-mobile">
          {links.map(l => (
            <a key={l.label} href={l.href} style={{
              fontSize: 14, color: "#a1a1aa", textDecoration: "none",
              transition: "color 0.2s", fontWeight: 500,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.color = "#a1a1aa")}
            >{l.label}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/login" style={{
            fontSize: 13, fontWeight: 500, color: "#a1a1aa",
            textDecoration: "none", padding: "6px 12px", transition: "color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fafafa")}
          onMouseLeave={e => (e.currentTarget.style.color = "#a1a1aa")}
          >Sign in</a>
          <AddToChromeBtn small />
        </div>
      </nav>

      <style>{`@media(max-width:640px){.hide-mobile{display:none!important}}`}</style>
    </motion.header>
  );
}

export function AddToChromeBtn({ small = false }: { small?: boolean }) {
  return (
    <a
      href="https://chromewebstore.google.com/detail/nglhmaeijiphnabgdeeimepoophpffpd"
      target="_blank" rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        color: "#07070a",
        fontWeight: 700,
        fontSize: small ? 13 : 15,
        padding: small ? "8px 16px" : "13px 26px",
        borderRadius: 10,
        textDecoration: "none", border: "none", cursor: "pointer",
        boxShadow: "0 0 0 1px rgba(245,158,11,0.5), 0 4px 20px rgba(245,158,11,0.3)",
        transition: "transform 0.2s, box-shadow 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(245,158,11,0.6), 0 8px 32px rgba(245,158,11,0.45)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(245,158,11,0.5), 0 4px 20px rgba(245,158,11,0.3)";
      }}
    >
      <ChromeIcon size={small ? 14 : 16} />
      Add to Chrome — it's free
    </a>
  );
}

function ChromeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="#07070a" opacity="0.8" />
      <path d="M12 8h8.5M12 8a4 4 0 0 0-4 4M12 8a4 4 0 0 1 4 4" stroke="#07070a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 12a4 4 0 0 0 2 3.46M8 12H3.5"   stroke="#07070a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 12a4 4 0 0 1-2 3.46M16 12l2.5 4.33" stroke="#07070a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
