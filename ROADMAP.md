# NeuroApply AI — Feature Roadmap & Ideas

A detailed evaluation of proposed features: what they are, how we'd build them on our
current stack (FastAPI + MV3 extension + Next.js + OpenAI + Postgres/pgvector + Redis),
the trade-offs, risks, effort, and a suggested sequencing.

> ⚠️ **Read the "Automation & LinkedIn ToS" callout before building #2 and #3.** Two of
> these ideas carry a real risk of getting users' LinkedIn accounts restricted or banned.

---

## Snapshot

| # | Idea | Value | Effort | Risk | Recommendation |
|---|------|-------|--------|------|----------------|
| 1 | More dashboard screens | High | Low–Med | None | ✅ Do next |
| 4 | ATS score (JD ↔ resume) | High | Medium | Low | ✅ High-leverage; reuses our embeddings |
| 2 | Auto-click Next/Submit | Medium | Low–Med | ⚠️ Medium (ToS) | 🟡 Auto-advance only; never auto-submit |
| 5 | Per-job tailored resume | Very High | High | Medium | 🟢 Flagship future feature |
| 3 | Selenium auto-apply / auto-click jobs | Medium | High | 🔴 High (ban) | 🔴 Avoid in current form |

---

## 1. More dashboard screens

**Today:** Overview · Profile · Resume — functional but thin.

**Proposed additions (in rough priority):**

1. **Applications tracker** — a full list / Kanban of every application with status
   columns (*Applied → Screening → Interview → Offer → Rejected*). We already log
   applications (`job_applications` table); this is the natural next surface.
   - Backend: extend `JobApplication` with a `status` field + `PATCH /applications/{id}`.
   - Frontend: a board view; drag-to-move between columns.
2. **Analytics / Insights** — charts over the tracked data: applications per week,
   response/interview rate, time saved, top companies/roles applied to.
3. **ATS Score** — see idea #4 (gets its own screen).
4. **Cover-letter generator** — paste/select a JD → LLM drafts a tailored cover letter
   using profile + resume context (reuses our OpenAI + resume RAG).
5. **Answer library** — manage the answers NeuroApply has learned (the `answer_history`
   table) — view, edit, delete. Gives users control + transparency.
6. **Job discovery / saved jobs** — paste a job URL to save, score, and prep for it.
7. **Settings** — autofill toggles, default answers, salary preferences, data export/delete
   (also needed for the privacy policy promises).
8. **Interview prep** — generate likely questions from the JD + the user's profile.

**Effort:** Low–Medium per screen. The Applications tracker + Analytics are the highest
value because they turn the data we already collect into something users feel.

---

## 2. Automate clicking "Next" / "Submit"

**Goal:** after NeuroApply fills a step, advance the multi-step Easy Apply flow automatically.

**Feasibility:** Technically easy — the content script can already find the Next/Continue
button and call `.click()` programmatically (we already *detect* these buttons).

**Strong recommendation: auto-ADVANCE, never auto-SUBMIT.**
- ✅ **Auto-advance** through intermediate steps (`Next` / `Continue` / `Review`) once all
  required fields on a step are filled — behind a user setting that's **off by default**.
- 🚫 **Never auto-click the final `Submit application`.** Always stop and let the user
  review and submit. Reasons:
  - **Accuracy:** an LLM-filled answer could be wrong; auto-submitting ships mistakes.
  - **Consent:** users must knowingly apply to each job.
  - **ToS:** auto-submitting *at scale* is exactly the "simulates human behavior at scale"
    pattern LinkedIn penalizes (see callout below).

**Implementation sketch:**
- Add `autoAdvance` setting in the popup/storage.
- After `fillAll` reports `unresolved === 0` for required fields, wait a short randomized
  delay, then click the nav button. Guard against loops (don't re-click the same step;
  stop if a required field is empty or a captcha/error appears).
- Hard stop at the submit step → surface "Ready to submit — review and click Submit."

**Effort:** Low–Medium. **Risk:** Medium (mitigated by never auto-submitting).

---

## 3. Selenium / auto-click jobs (extension applies on its own)

**Goal:** the tool opens job listings, clicks Easy Apply, and applies across many jobs
autonomously — optionally via Selenium driving a browser.

**🔴 This is the highest-risk idea and I'd advise against it in this form.** Research on
LinkedIn's current enforcement (2025–2026):
- LinkedIn's User Agreement **explicitly prohibits** software that automates actions,
  including **headless browsers** and **automated/detectable browser control** — i.e.
  Selenium is squarely in the prohibited category. ([LinkedIn ToS analysis][tos1], [northlight][tos2])
- LinkedIn now uses **behavioral biometrics** — it looks for the "mathematical precision
  of a script" vs. the irregular rhythm of a human, and **banned 23.5M bot sessions** in a
  recent quarter. ([PhantomBuster][tos3])
- **Penalty:** temporary restriction → permanent ban → loss of the user's entire network.

**Important nuance that works in our favor:** tools that run **in the user's real browser,
on their own machine, triggered by the user** are treated as a *different, lower-risk
category* than cloud/headless automation. **Our extension is already in the safer category**
— a content script that fills a form the user opened. Moving to Selenium or auto-opening/
auto-applying across many jobs **pushes us out of that safe zone**.

**If we ever pursue autonomous applying, do it safely:**
- Keep it **in the user's own browser** (extension-driven), **never Selenium/headless**.
- **Human-like behavior:** randomized delays, variable timing, scroll/mouse jitter.
- **Hard daily caps** and a kill-switch; require explicit per-session opt-in.
- Prominent warnings that batch auto-apply may risk their LinkedIn account.

**Recommendation:** 🔴 Don't build Selenium-based auto-apply. If autonomy is desired,
limit it to **#2's auto-advance** (still human-submitted) and revisit later with heavy
guardrails. **Effort:** High. **Risk:** High (account bans).

---

## 4. ATS score (analyze JD + resume)

**Goal:** when a user wants it, score how well their resume matches a job description, and
show what to improve.

**This is high-leverage and a great fit for our stack** — we already store the resume,
extract structured fields, and have **OpenAI embeddings + pgvector**.

**How ATS scoring actually works** (so we match real behavior):
- ATS compares the **whole resume to the JD**, with **keyword relevance ≈ 30–40% of the
  score** — hard skills, certifications, role-specific terms — weighted by **frequency and
  section placement**. ([Jobscan][ats1], [Interview Guys][ats2])
- A **75%+ match** is the practical "good" threshold for landing in the review queue. ([Jobscan][ats1])
- Modern ATS add **semantic matching** ("ARR growth" ≈ "revenue expansion") — not just
  literal strings. ([Jobscan][ats1])

**Proposed approach (hybrid, mirrors real ATS):**
1. **Extract keywords/skills from the JD** — LLM (gpt-4o-mini) returns required hard skills,
   tools, certifications, and key phrases, each tagged must-have vs nice-to-have.
2. **Match against the resume** on two axes:
   - **Exact/lexical:** which JD keywords literally appear (frequency + section).
   - **Semantic:** embed JD keywords and resume chunks (we already do this) and measure
     cosine similarity to catch synonyms/related skills.
3. **Score:** weighted blend (e.g. keyword coverage 40%, semantic similarity 30%,
   must-have coverage 20%, basic formatting/section checks 10%) → 0–100, with the 75%
   "interview-likely" band highlighted.
4. **Actionable output:** matched keywords ✓, **missing must-haves** ✗, and concrete
   suggestions ("add 'Kubernetes' to skills if you have it").

**Endpoint:** `POST /api/v1/ats/score` `{ job_description }` → `{ score, matched[], missing[], suggestions[] }`.
**UI:** a new "ATS Score" screen — paste a JD (or pull from the current LinkedIn job) → score + gaps.

**Caveat to communicate:** every ATS is different and many "scores" are estimates — present
it as **guidance**, not a guarantee. **Effort:** Medium. **Risk:** Low.

---

## 5. Per-job tailored resume (far-future flagship)

**Goal:** for a selected job, generate a resume tailored to that opening to raise shortlist odds.

**Why it's powerful:** tailoring to the JD's keywords/emphasis is the single biggest lever
for passing ATS keyword filters and catching a recruiter's eye — and it pairs perfectly
with #4 (score → then tailor to close the gap).

**Approach:**
1. Start from the user's **master resume** (we already parse + store it).
2. Use the **ATS gap analysis (#4)** to know which JD keywords/skills to surface.
3. LLM **rewrites/reorders** bullets and the summary to emphasize relevant, *truthful*
   experience and weave in missing-but-applicable keywords.
4. Render an **ATS-friendly PDF** (clean, single-column, standard headings) — e.g. an HTML
   template → PDF (WeasyPrint/Playwright). Store per-job so it's reusable.
5. Optionally **auto-attach** the tailored resume when applying to that job.

**Guardrails (critical):**
- ⚖️ **Never fabricate** experience, titles, dates, or skills — only re-emphasize what's
  true. This protects the user from interview/credibility blowback.
- Keep formatting **ATS-safe** (no tables/columns/graphics that break parsing).
- Always let the user **review and edit** before use.

**Effort:** High (LLM rewrite + PDF generation + storage + UI). **Risk:** Medium (accuracy/honesty).
**Recommendation:** 🟢 Strong flagship feature; build **after #4** since it reuses the gap analysis.

---

## Suggested sequencing

1. **#1 Applications tracker + Analytics** — turn data we already collect into value. *(low effort, high feel)*
2. **#4 ATS Score** — reuses embeddings; standalone value; foundation for #5. *(medium)*
3. **#2 Auto-advance** (never auto-submit) — quality-of-life, behind an off-by-default toggle. *(low)*
4. **#5 Tailored resume** — flagship; builds on #4. *(high)*
5. **#3 Selenium/auto-apply** — ❌ not recommended; revisit only with heavy guardrails, never headless.

---

## ⚠️ Automation & LinkedIn ToS — read before #2/#3

- LinkedIn's User Agreement **prohibits** automation that "simulates human behavior at
  scale," **headless browsers**, scraping, and detectable bot control. ([ConnectSafely][tos4], [northlight][tos2])
- Enforcement is **aggressive and behavioral** (biometrics, rhythm analysis; tens of
  millions of bot sessions banned per quarter). ([PhantomBuster][tos3])
- **Safer zone (where we are now):** runs in the **user's own browser**, user-initiated,
  fills a form the user opened. **Riskier zone:** auto-submitting, auto-opening/applying to
  many jobs, or **any Selenium/headless** control.
- **Design principle going forward:** keep a **human in the loop at submit**, add human-like
  timing + caps for any automation, and **never ship headless/Selenium auto-apply**.

---

### Sources
- [Jobscan — ATS resume guide][ats1]
- [The Interview Guys — what ATS looks for][ats2]
- [PhantomBuster — why LinkedIn flags automation][tos3]
- [northlight.ai — is LinkedIn automation against the rules][tos2]
- [ConnectSafely — LinkedIn automation safety / ToS][tos4]
- [LinkedIn ToS & job-search automation discussion][tos1]

[ats1]: https://www.jobscan.co/blog/ats-resume/
[ats2]: https://blog.theinterviewguys.com/what-ats-looks-for-in-resumes/
[tos1]: https://www.linkedin.com/posts/r-thomas-ross_ai-linkedin-termsofservice-activity-7386733065198317568-AWvs
[tos2]: https://northlight.ai/blog/is-linkedin-automation-against-the-rules
[tos3]: https://phantombuster.com/blog/social-selling/linkedin-automation-tool-warning/
[tos4]: https://connectsafely.ai/articles/is-linkedin-automation-safe-tos-scraping-guide-2026
