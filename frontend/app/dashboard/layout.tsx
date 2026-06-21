"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Aurora from "@/components/Aurora";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: <IconZap /> },
  { href: "/dashboard/profile", label: "Profile", icon: <IconUser /> },
  { href: "/dashboard/resume", label: "Resume", icon: <IconFile /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
    else setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <div style={shell}>
      <Aurora subtle />

      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={sidebar}
      >
        <div style={brand}>
          <Image src="/logo.png" alt="" width={32} height={32} style={{ borderRadius: 8, boxShadow: "0 0 14px rgba(129,140,248,0.5)" }} />
          <span style={brandName}>NeuroApply</span>
        </div>

        <nav style={nav}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{ ...navItem, ...(active ? navItemActive : {}) }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <span style={{ display: "flex", color: active ? "#a78bfa" : "#64748b" }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {active && <span style={activeDot} />}
                </div>
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} style={logoutBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)"; (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}>
          Sign Out
        </button>
      </motion.aside>

      <main style={main}>{children}</main>
    </div>
  );
}

function IconZap() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>; }
function IconUser() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function IconFile() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>; }

const shell: React.CSSProperties = { display: "flex", minHeight: "100vh", background: "#070b1a", position: "relative", overflow: "hidden" };
const sidebar: React.CSSProperties = {
  width: 230, position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 2,
  display: "flex", flexDirection: "column", padding: "22px 16px", gap: 8,
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
  borderRight: "1px solid rgba(255,255,255,0.07)",
};
const brand: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "0 6px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 10,
};
const brandName: React.CSSProperties = {
  fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em",
  background: "linear-gradient(135deg, #c7d2fe, #a78bfa)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
};
const nav: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, flex: 1 };
const navItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11,
  color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer",
  transition: "background 0.18s, color 0.18s", position: "relative",
};
const navItemActive: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))",
  color: "#e9d5ff", border: "1px solid rgba(129,140,248,0.22)",
};
const activeDot: React.CSSProperties = {
  marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
  background: "#a78bfa", boxShadow: "0 0 8px #a78bfa",
};
const logoutBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b",
  borderRadius: 11, padding: "11px", fontSize: 13, fontWeight: 500, cursor: "pointer",
  marginTop: "auto", transition: "all 0.18s",
};
const main: React.CSSProperties = {
  marginLeft: 230, flex: 1, padding: "40px 40px 80px", maxWidth: 1000,
  position: "relative", zIndex: 1,
};
