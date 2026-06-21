import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NeuroApply AI",
  description: "How NeuroApply AI collects, uses, and protects your data.",
};

const UPDATED = "June 21, 2026";
const CONTACT = "singhshishir4727@gmail.com";

export default function PrivacyPolicy() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "80px 24px 120px",
        color: "#cbd5e1",
        lineHeight: 1.7,
        fontSize: 16,
      }}
    >
      <a href="/" style={{ color: "#818cf8", textDecoration: "none", fontSize: 14 }}>
        ← Back to NeuroApply AI
      </a>

      <h1 style={{ fontSize: 40, fontWeight: 800, color: "#f1f5f9", margin: "28px 0 6px", letterSpacing: "-0.02em" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 40 }}>Last updated: {UPDATED}</p>

      <Section title="Overview">
        NeuroApply AI (&ldquo;NeuroApply,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is a Chrome extension and
        companion service that helps you fill out LinkedIn Easy Apply job
        application forms using information you provide. This policy explains
        what we collect, how we use it, and the choices you have. We collect
        only what is needed to autofill your own applications — nothing more.
      </Section>

      <Section title="Information We Collect">
        <ul style={listStyle}>
          <li><b>Account information:</b> your email address and a securely hashed password.</li>
          <li><b>Profile information you provide:</b> name, contact details, location, years of experience, current/expected salary, notice period, work authorization, skills, and similar job-application fields.</li>
          <li><b>Resume files:</b> if you upload a resume, we store the file and the structured text extracted from it.</li>
          <li><b>Answer history:</b> answers you confirm or correct on application forms, so we can reuse them on future applications.</li>
        </ul>
        We do <b>not</b> collect your LinkedIn password, your browsing history, or
        any data from pages outside the job-application forms you choose to fill.
      </Section>

      <Section title="How We Use Your Information">
        <ul style={listStyle}>
          <li>To detect job-application form fields and fill them with your information.</li>
          <li>To generate answers for custom screening questions using your profile context.</li>
          <li>To remember your corrections and improve future autofills.</li>
          <li>To authenticate you and keep your account secure.</li>
        </ul>
        We use your data <b>only</b> to provide the autofill service to you. We do
        not sell, rent, or share your personal information with advertisers, and
        we never auto-submit applications or modify your LinkedIn profile.
      </Section>

      <Section title="Third-Party Services">
        To provide the service we rely on:
        <ul style={listStyle}>
          <li><b>OpenAI:</b> when a form has a custom question, the question text and relevant profile context are sent to OpenAI&rsquo;s API to generate an appropriate answer. OpenAI processes this data on our behalf and does not use it to train its models via the API.</li>
          <li><b>Cloud hosting &amp; database:</b> your data is stored in a managed PostgreSQL database and cached in Redis to make autofills fast.</li>
        </ul>
        These providers process data solely to deliver NeuroApply&rsquo;s functionality.
      </Section>

      <Section title="Data Storage &amp; Security">
        Passwords are hashed with bcrypt and never stored in plain text.
        Access is protected with signed authentication tokens. Data is
        transmitted over encrypted HTTPS connections. While no system is
        perfectly secure, we take reasonable measures to protect your information.
      </Section>

      <Section title="Data Retention &amp; Your Choices">
        Your profile, resume, and answer history are retained while your account
        is active so the extension can keep autofilling for you. You can request
        access to, correction of, or deletion of your data at any time by
        emailing us. Deleting your account removes your stored profile, resume,
        and answer history.
      </Section>

      <Section title="Children's Privacy">
        NeuroApply AI is intended for job seekers and is not directed at
        children under 16. We do not knowingly collect data from children.
      </Section>

      <Section title="Changes to This Policy">
        We may update this policy from time to time. Material changes will be
        reflected by updating the &ldquo;Last updated&rdquo; date above.
      </Section>

      <Section title="Contact">
        Questions, requests, or data-deletion requests? Email{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#818cf8" }}>{CONTACT}</a>.
      </Section>
    </main>
  );
}

const listStyle: React.CSSProperties = {
  margin: "12px 0",
  paddingLeft: 22,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 10px" }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
