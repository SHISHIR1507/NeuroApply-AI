"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";
import Aurora from "@/components/Aurora";
import { Field, AuthStyles, ManualScene, AutoScene } from "../login/page";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/welcome";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.register(email, password, name);
      setSession(data.access_token);
      router.push(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={wrap}>
      <Aurora />
      <div style={grid}>
        <ManualScene />
        <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={card}
      >
        <div style={glowOrb} aria-hidden />

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={logoRing}
        >
          <Image src="/logo.png" alt="NeuroApply" width={48} height={48} style={{ borderRadius: 12 }} />
        </motion.div>

        <h1 style={title}>Create your account</h1>
        <p style={subtitle}>Start autofilling in three minutes</p>

        <form onSubmit={handleSubmit} style={form}>
          <Field label="Full Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Shishir Singh" required className="na-input" />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required className="na-input" />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" required minLength={8} className="na-input" />
          </Field>

          {error && (
            <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 0] }}
              transition={{ duration: 0.4 }} style={errStyle}>{error}</motion.p>
          )}

          <button type="submit" disabled={loading} className="na-btn">
            {loading ? <span className="na-spin" /> : "Create Account"}
          </button>
        </form>

        <p style={footer}>
          Already have an account? <Link href="/login" style={link}>Sign in</Link>
        </p>
        </motion.div>
        <AutoScene />
      </div>

      <AuthStyles />
      <style>{`@media (max-width: 1080px){ .na-side-scene { display:none !important; } }`}</style>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  padding: 24, position: "relative", overflow: "hidden",
};
const grid: React.CSSProperties = {
  position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 420px 1fr",
  gap: 24, alignItems: "center", maxWidth: 1200, width: "100%",
};
const card: React.CSSProperties = {
  position: "relative", zIndex: 3, width: "100%", padding: "44px 38px",
  background: "rgba(17,20,38,0.72)", backdropFilter: "blur(28px)",
  border: "1px solid rgba(245,158,11,0.25)", borderRadius: 24,
  boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(245,158,11,0.2)",
  textAlign: "center", overflow: "hidden",
};
const glowOrb: React.CSSProperties = {
  position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
  width: 260, height: 160, background: "radial-gradient(circle, rgba(245,158,11,0.35), transparent 70%)",
  filter: "blur(30px)", pointerEvents: "none",
};
const logoRing: React.CSSProperties = {
  width: 72, height: 72, margin: "0 auto 20px", borderRadius: 18,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
  boxShadow: "0 0 30px rgba(245,158,11,0.35)", position: "relative", zIndex: 1,
};
const title: React.CSSProperties = {
  fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px",
  background: "linear-gradient(135deg, #f1f5f9, #f59e0b)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
};
const subtitle: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "0 0 28px" };
const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const errStyle: React.CSSProperties = {
  color: "#fca5a5", fontSize: 13, margin: 0, padding: "8px 12px",
  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 9,
};
const footer: React.CSSProperties = { color: "#64748b", fontSize: 13, marginTop: 22 };
const link: React.CSSProperties = { color: "#f59e0b", textDecoration: "none", fontWeight: 600 };
