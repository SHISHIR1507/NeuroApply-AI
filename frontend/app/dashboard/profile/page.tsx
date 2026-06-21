"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, Profile } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProfile().then((p) => { setProfile(p); setLoading(false); });
  }, []);

  function set(key: keyof Profile, value: unknown) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.updateProfile(profile);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: "#64748b", padding: 40 }}>Loading…</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 26 }}>
        <h1 style={heading}>Your Profile</h1>
        <p style={sub}>This data is used to autofill your job application forms</p>
      </motion.div>

      <motion.form
        onSubmit={handleSave}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={formCard}
      >
        <Section title="Personal Info">
          <Row>
            <Field label="Full Name"><input className="na-input" value={profile.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Shishir Singh" /></Field>
            <Field label="Email"><input className="na-input" value={profile.email ?? ""} disabled placeholder="your@email.com" /></Field>
          </Row>
          <Row>
            <Field label="Phone"><input className="na-input" value={profile.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91-9999999999" /></Field>
            <Field label="Location"><input className="na-input" value={profile.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Mumbai, India" /></Field>
          </Row>
        </Section>

        <Section title="Work Info">
          <Row>
            <Field label="Current Title"><input className="na-input" value={profile.current_title ?? ""} onChange={(e) => set("current_title", e.target.value)} placeholder="Software Engineer" /></Field>
            <Field label="Current Company"><input className="na-input" value={profile.current_company ?? ""} onChange={(e) => set("current_company", e.target.value)} placeholder="Acme Corp" /></Field>
          </Row>
          <Row>
            <Field label="Years of Experience"><input className="na-input" type="number" value={profile.years_of_experience ?? ""} onChange={(e) => set("years_of_experience", parseInt(e.target.value) || null)} placeholder="3" /></Field>
            <Field label="Expected Salary"><input className="na-input" value={profile.expected_salary ?? ""} onChange={(e) => set("expected_salary", e.target.value)} placeholder="₹20 LPA" /></Field>
          </Row>
          <Row>
            <Field label="Notice Period"><input className="na-input" value={profile.notice_period ?? ""} onChange={(e) => set("notice_period", e.target.value)} placeholder="30 days" /></Field>
            <Field label="Work Authorization"><input className="na-input" value={profile.work_authorization ?? ""} onChange={(e) => set("work_authorization", e.target.value)} placeholder="Indian Citizen" /></Field>
          </Row>
          <Row>
            <Field label="Willing to Relocate">
              <select className="na-input" value={profile.willing_to_relocate == null ? "" : String(profile.willing_to_relocate)} onChange={(e) => set("willing_to_relocate", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">Select</option><option value="true">Yes</option><option value="false">No</option>
              </select>
            </Field>
            <Field label="Requires Sponsorship">
              <select className="na-input" value={profile.requires_sponsorship == null ? "" : String(profile.requires_sponsorship)} onChange={(e) => set("requires_sponsorship", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">Select</option><option value="true">Yes</option><option value="false">No</option>
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Links">
          <Row>
            <Field label="LinkedIn URL"><input className="na-input" value={profile.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/you" /></Field>
            <Field label="GitHub URL"><input className="na-input" value={profile.github_url ?? ""} onChange={(e) => set("github_url", e.target.value)} placeholder="https://github.com/you" /></Field>
          </Row>
          <Field label="Portfolio URL"><input className="na-input" value={profile.portfolio_url ?? ""} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://yourportfolio.com" /></Field>
        </Section>

        <Section title="Skills">
          <Field label="Skills (comma separated)">
            <input className="na-input" value={(profile.skills ?? []).join(", ")}
              onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="React, TypeScript, Python, FastAPI" />
          </Field>
        </Section>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button type="submit" disabled={saving} className="na-btn" style={{ width: "auto", padding: "12px 28px" }}>
            {saving ? <span className="na-spin" /> : "Save Profile"}
          </button>
          {saved && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✓ Saved</motion.span>}
          {error && <span style={{ color: "#fca5a5", fontSize: 13 }}>{error}</span>}
        </div>
      </motion.form>

      <FormStyles />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ color: "#64748b", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{title}</h2>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

export function FormStyles() {
  return (
    <style>{`
      .na-input {
        width: 100%; padding: 11px 13px; font-size: 14px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10);
        border-radius: 10px; color: #f1f5f9; outline: none;
        transition: border-color .2s, box-shadow .2s, background .2s;
      }
      .na-input::placeholder { color: #5b6678; }
      .na-input:disabled { opacity: .55; cursor: not-allowed; }
      .na-input:focus {
        border-color: rgba(129,140,248,0.7); background: rgba(255,255,255,0.06);
        box-shadow: 0 0 0 3px rgba(129,140,248,0.16);
      }
      select.na-input { appearance: none; cursor: pointer; }
      .na-btn {
        position: relative; overflow: hidden; padding: 12px; font-size: 14px; font-weight: 600;
        color: #fff; border: none; border-radius: 11px; cursor: pointer;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        box-shadow: 0 8px 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
        transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .25s, opacity .2s;
      }
      .na-btn:hover { box-shadow: 0 10px 30px rgba(99,102,241,0.55); }
      .na-btn:active { transform: scale(0.98); }
      .na-btn:disabled { opacity: .8; cursor: default; }
      .na-spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; animation: na-rot .7s linear infinite; }
      @keyframes na-rot { to { transform: rotate(360deg); } }
    `}</style>
  );
}

const heading: React.CSSProperties = { color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "6px 0 0" };
const formCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 28,
  display: "flex", flexDirection: "column", gap: 28,
};
