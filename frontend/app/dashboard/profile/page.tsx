"use client";
import { useEffect, useState } from "react";
import { api, Profile } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
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

  if (loading) return <div style={{ color: "#888", padding: "40px" }}>Loading...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Your Profile</h1>
        <p style={styles.sub}>This data is used to autofill job application forms</p>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        <Section title="Personal Info">
          <Row>
            <Field label="Full Name">
              <input style={styles.input} value={profile.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Shishir Singh" />
            </Field>
            <Field label="Email">
              <input style={styles.input} value={profile.email ?? ""} disabled placeholder="your@email.com" />
            </Field>
          </Row>
          <Row>
            <Field label="Phone">
              <input style={styles.input} value={profile.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91-9999999999" />
            </Field>
            <Field label="Location">
              <input style={styles.input} value={profile.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Mumbai, India" />
            </Field>
          </Row>
        </Section>

        <Section title="Work Info">
          <Row>
            <Field label="Current Title">
              <input style={styles.input} value={profile.current_title ?? ""} onChange={(e) => set("current_title", e.target.value)} placeholder="Software Engineer" />
            </Field>
            <Field label="Current Company">
              <input style={styles.input} value={profile.current_company ?? ""} onChange={(e) => set("current_company", e.target.value)} placeholder="Acme Corp" />
            </Field>
          </Row>
          <Row>
            <Field label="Years of Experience">
              <input style={styles.input} type="number" value={profile.years_of_experience ?? ""} onChange={(e) => set("years_of_experience", parseInt(e.target.value) || null)} placeholder="3" />
            </Field>
            <Field label="Expected Salary">
              <input style={styles.input} value={profile.expected_salary ?? ""} onChange={(e) => set("expected_salary", e.target.value)} placeholder="₹20 LPA" />
            </Field>
          </Row>
          <Row>
            <Field label="Notice Period">
              <input style={styles.input} value={profile.notice_period ?? ""} onChange={(e) => set("notice_period", e.target.value)} placeholder="30 days" />
            </Field>
            <Field label="Work Authorization">
              <input style={styles.input} value={profile.work_authorization ?? ""} onChange={(e) => set("work_authorization", e.target.value)} placeholder="Indian Citizen" />
            </Field>
          </Row>
          <Row>
            <Field label="Willing to Relocate">
              <select style={styles.input} value={profile.willing_to_relocate == null ? "" : String(profile.willing_to_relocate)} onChange={(e) => set("willing_to_relocate", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <Field label="Requires Sponsorship">
              <select style={styles.input} value={profile.requires_sponsorship == null ? "" : String(profile.requires_sponsorship)} onChange={(e) => set("requires_sponsorship", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Links">
          <Row>
            <Field label="LinkedIn URL">
              <input style={styles.input} value={profile.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
            </Field>
            <Field label="GitHub URL">
              <input style={styles.input} value={profile.github_url ?? ""} onChange={(e) => set("github_url", e.target.value)} placeholder="https://github.com/yourusername" />
            </Field>
          </Row>
          <Field label="Portfolio URL">
            <input style={styles.input} value={profile.portfolio_url ?? ""} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://yourportfolio.com" />
          </Field>
        </Section>

        <Section title="Skills">
          <Field label="Skills (comma separated)">
            <input
              style={styles.input}
              value={(profile.skills ?? []).join(", ")}
              onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="React, TypeScript, Python, FastAPI"
            />
          </Field>
        </Section>

        {error && <p style={styles.error}>{error}</p>}
        {saved && <p style={styles.success}>✓ Profile saved</p>}

        <button type="submit" disabled={saving} style={styles.btn}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <h2 style={{ color: "#aaa", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ color: "#888", fontSize: "12px", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "0" },
  header: { marginBottom: "28px" },
  heading: { color: "#e8e8e8", fontSize: "26px", fontWeight: 700, margin: "0 0 6px" },
  sub: { color: "#888", fontSize: "14px", margin: 0 },
  form: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
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
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    alignSelf: "flex-start",
  },
  error: { color: "#ef4444", fontSize: "13px", margin: 0 },
  success: { color: "#22c55e", fontSize: "13px", margin: 0 },
};
