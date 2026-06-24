"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, AnswerItem } from "@/lib/api";

export default function AnswersPage() {
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.getAnswers().then((a) => { setAnswers(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return answers;
    return answers.filter((a) => a.question_text.toLowerCase().includes(q) || a.answer_value.toLowerCase().includes(q));
  }, [answers, query]);

  async function save(id: string) {
    setBusyId(id);
    try {
      const updated = await api.updateAnswer(id, draft);
      setAnswers((list) => list.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
    } catch { /* keep editing */ } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api.deleteAnswer(id);
      setAnswers((list) => list.filter((a) => a.id !== id));
    } catch { /* noop */ } finally { setBusyId(null); }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 22 }}>
        <h1 style={heading}>Answer Library</h1>
        <p style={sub}>Every answer NeuroApply has learned. Edit or remove any — changes apply to future autofills instantly.</p>
      </motion.div>

      {!loading && answers.length > 0 && (
        <div style={searchWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions or answers…" style={searchInput} />
          <span style={{ color: "#475569", fontSize: 12.5 }}>{filtered.length} of {answers.length}</span>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#64748b", padding: 40 }}>Loading…</div>
      ) : answers.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence initial={false}>
            {filtered.map((a, i) => (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={question}>{a.question_text}</p>
                  {editingId === a.id ? (
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") save(a.id); if (e.key === "Escape") setEditingId(null); }}
                      className="na-ans-input" />
                  ) : (
                    <p style={answerVal}>{a.answer_value}</p>
                  )}
                  <div style={meta}>
                    {a.canonical_key && <span style={tag}>{a.canonical_key}</span>}
                    <span style={{ color: "#475569", fontSize: 11.5 }}>used {a.times_used}×</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {editingId === a.id ? (
                    <>
                      <button onClick={() => save(a.id)} disabled={busyId === a.id} style={iconBtn("#4ade80")} title="Save">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </button>
                      <button onClick={() => setEditingId(null)} style={iconBtn("#94a3b8")} title="Cancel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(a.id); setDraft(a.answer_value); }} style={iconBtn("#a78bfa")} title="Edit">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                      </button>
                      <button onClick={() => remove(a.id)} disabled={busyId === a.id} style={iconBtn("#f87171")} title="Delete">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        .na-ans-input { width:100%; margin-top:4px; padding:8px 11px; font-size:14px; background:rgba(255,255,255,0.05);
          border:1px solid rgba(129,140,248,0.5); border-radius:9px; color:#f1f5f9; outline:none;
          box-shadow:0 0 0 3px rgba(129,140,248,0.16); }
      `}</style>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 20px", gap: 8 }}>
      <div style={{ width: 56, height: 56, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#a78bfa", marginBottom: 6 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
      </div>
      <p style={{ color: "#cbd5e1", fontSize: 15, fontWeight: 600, margin: 0 }}>No saved answers yet</p>
      <p style={{ color: "#64748b", fontSize: 13.5, margin: 0, maxWidth: 360, lineHeight: 1.5 }}>
        As you apply and correct answers on LinkedIn, NeuroApply learns them and they&rsquo;ll appear here — ready to reuse and edit.
      </p>
    </div>
  );
}

const heading: React.CSSProperties = { color: "#f1f5f9", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 14, margin: "6px 0 0", maxWidth: 560 };
const searchWrap: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 };
const searchInput: React.CSSProperties = { flex: 1, background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: 14 };
const row: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 14, padding: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };
const question: React.CSSProperties = { color: "#94a3b8", fontSize: 12.5, fontWeight: 500, margin: "0 0 5px" };
const answerVal: React.CSSProperties = { color: "#f1f5f9", fontSize: 14.5, fontWeight: 500, margin: 0, wordBreak: "break-word" };
const meta: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginTop: 8 };
const tag: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, color: "#a5b4fc", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 6, padding: "2px 7px" };
const iconBtn = (color: string): React.CSSProperties => ({ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}14`, border: `1px solid ${color}30`, color, cursor: "pointer", transition: "all .15s" });
