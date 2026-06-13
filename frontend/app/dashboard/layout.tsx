"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "⚡" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤" },
  { href: "/dashboard/resume", label: "Resume", icon: "📄" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <span style={styles.brandName}>NeuroApply</span>
        </div>
        <nav style={styles.nav}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#0f0f0f",
  },
  sidebar: {
    width: "220px",
    background: "#1a1a1a",
    borderRight: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    gap: "8px",
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 8px 24px",
    borderBottom: "1px solid #2a2a2a",
    marginBottom: "8px",
  },
  brandName: {
    color: "#e8e8e8",
    fontWeight: 700,
    fontSize: "16px",
  },
  nav: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    color: "#888",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  navItemActive: {
    background: "#6366f120",
    color: "#818cf8",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    color: "#888",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "auto",
  },
  main: {
    marginLeft: "220px",
    flex: 1,
    padding: "32px",
    maxWidth: "900px",
  },
};
