"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🧠</div>
        <h1 style={styles.title}>NeuroApply AI</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          No account?{" "}
          <Link href="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f0f0f",
    padding: "20px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  logo: { fontSize: "40px", marginBottom: "12px" },
  title: { color: "#e8e8e8", fontSize: "22px", fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#888", fontSize: "14px", margin: "0 0 28px" },
  form: { display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: "#aaa", fontSize: "13px", fontWeight: 500 },
  input: {
    background: "#222",
    border: "1px solid #333",
    borderRadius: "8px",
    color: "#e8e8e8",
    fontSize: "14px",
    padding: "10px 14px",
    outline: "none",
    width: "100%",
  },
  btn: {
    background: "#6366f1",
    color: "#fff",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    marginTop: "4px",
  },
  error: { color: "#ef4444", fontSize: "13px", margin: 0 },
  footer: { color: "#888", fontSize: "13px", marginTop: "20px" },
  link: { color: "#6366f1", textDecoration: "none" },
};
