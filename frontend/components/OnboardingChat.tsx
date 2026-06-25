"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, Profile } from "@/lib/api";

type Msg = { role: "bot" | "user"; text: string; tags?: string[] };

const LABELS: Record<string, string> = {
  full_name: "Name", phone: "Phone", location: "Location",
  current_title: "Title", current_company: "Company",
  years_of_experience: "Experience", expected_salary: "Expected salary",
  notice_period: "Notice period", work_authorization: "Work authorization",
  willing_to_relocate: "Relocate", requires_sponsorship: "Sponsorship",
  linkedin_url: "LinkedIn", github_url: "GitHub", portfolio_url: "Portfolio", skills: "Skills",
};

// Essential fields the onboarding tries to collect, in order, with the
// question to ask for each. Drives a profile-aware greeting.
const NEEDED: { key: keyof Profile; q: string }[] = [
  { key: "current_title", q: "what's your current role or title?" },
  { key: "years_of_experience", q: "how many years of experience do you have?" },
  { key: "location", q: "where are you based — and open to relocating?" },
  { key: "expected_salary", q: "what's your expected salary?" },
  { key: "notice_period", q: "what's your notice period?" },
  { key: "work_authorization", q: "what's your work authorization or citizenship?" },
  { key: "skills", q: "what are a few of your key skills?" },
  { key: "linkedin_url", q: "what's your LinkedIn profile URL?" },
];

function isEmpty(v: unknown) {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function buildGreeting(profile?: Profile | null): string {
  if (!profile) {
    return "Hey! 👋 I'm your NeuroApply assistant. Let's build your profile so I can autofill job applications for you. To start: **what's your current role, and how many years of experience do you have?**";
  }
  const missing = NEEDED.filter((f) => isEmpty(profile[f.key]));
  const filledCount = NEEDED.length - missing.length;

  if (missing.length === 0) {
    return "Your profile looks complete ✅ — I've got everything I need. Tell me anything you'd like to **update or add**, or head to your dashboard.";
  }
  if (filledCount >= 2) {
    // Came in with data (e.g. from a resume) — acknowledge and ask the gap.
    return `Nice — I've already got ${filledCount} things from your profile ✓. Just a few gaps left. First: **${missing[0].q}**`;
  }
  return `Hey! 👋 Let's finish setting up your profile. First: **${missing[0].q}**`;
}

const STARTERS = [
  "I'm a Frontend Engineer with 3 years of experience",
  "My expected salary is 18 LPA, notice period 30 days",
  "I'm based in Bengaluru, open to relocating",
];

export default function OnboardingChat({ profile, onFieldsSaved }: { profile?: Profile | null; onFieldsSaved?: (fields: Record<string, unknown>) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [booting, setBooting] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<{ role: string; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The greeting "arrives" — typing indicator first, then it pops in.
  // It's profile-aware: it asks for the first MISSING field, never re-asks
  // things we already know (e.g. from the resume).
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ role: "bot", text: buildGreeting(profile) }]);
      setBooting(false);
    }, 750);
    return () => clearTimeout(t);
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, booting]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    history.current.push({ role: "user", content: msg });

    // placeholder bot bubble we stream into
    setMessages((m) => [...m, { role: "bot", text: "" }]);

    try {
      const res = await api.chatStream(msg, history.current.slice(-8), true);
      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let tags: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "delta") {
              full += evt.content;
              setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "bot", text: full, tags }; return c; });
            } else if (evt.type === "updates" && evt.fields) {
              tags = Object.keys(evt.fields).map((k) => LABELS[k] || k);
              setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "bot", text: full, tags }; return c; });
              onFieldsSaved?.(evt.fields);
            }
          } catch { /* skip partial */ }
        }
      }
      history.current.push({ role: "assistant", content: full });
    } catch {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "bot", text: "Hmm, I couldn't reach the server. Mind trying again?" }; return c; });
    } finally {
      setBusy(false);
    }
  }

  const hasData = !!profile && NEEDED.some((f) => !isEmpty(profile[f.key]));
  const showStarters = messages.length <= 1 && !busy && !booting && !hasData;

  return (
    <div style={shell}>
      <div ref={scrollRef} style={feed}>
        {booting && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={botBubble}><Typing /></div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={m.role === "user" ? userBubble : botBubble}>
                {m.role === "bot" && m.text === "" ? <Typing /> : <Rich text={m.text} />}
                {m.tags && m.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {m.tags.map((t) => (
                      <span key={t} style={savedTag}>✓ {t} saved</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showStarters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {STARTERS.map((s) => (
              <button key={s} onClick={() => send(s)} style={chip}>{s}</button>
            ))}
          </motion.div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={inputRow}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…"
          disabled={busy} className="na-chat-input" />
        <button type="submit" disabled={busy || !input.trim()} style={sendBtn} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </form>

      <style>{`
        .na-chat-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #f1f5f9; font-size: 14px; font-family: inherit;
        }
        .na-chat-input::placeholder { color: #5b6678; }
        .na-chat-input:disabled { opacity: .6; }
      `}</style>
    </div>
  );
}

function Rich({ text }: { text: string }) {
  // minimal **bold** support
  const html = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Typing() {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
      ))}
    </span>
  );
}

const shell: React.CSSProperties = {
  display: "flex", flexDirection: "column", height: "min(62vh, 560px)",
  background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden",
};
const feed: React.CSSProperties = { flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 12 };
const botBubble: React.CSSProperties = {
  maxWidth: "82%", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.2)",
  color: "#e6e9f2", padding: "11px 14px", borderRadius: "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.6,
};
const userBubble: React.CSSProperties = {
  maxWidth: "82%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
  padding: "11px 14px", borderRadius: "16px 4px 16px 16px", fontSize: 14, lineHeight: 1.6,
};
const savedTag: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.12)",
  border: "1px solid rgba(74,222,128,0.3)", padding: "2px 8px", borderRadius: 999,
};
const chip: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8",
  fontSize: 12.5, padding: "8px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all .15s",
};
const inputRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
  borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)",
};
const sendBtn: React.CSSProperties = {
  width: 38, height: 38, minWidth: 38, borderRadius: 11, border: "none", cursor: "pointer",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
};
