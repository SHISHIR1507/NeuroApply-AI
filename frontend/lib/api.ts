// Configurable per environment. Set NEXT_PUBLIC_API_URL in Vercel to the
// deployed backend origin (e.g. https://neuroapply-ai.onrender.com).
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL || "https://neuroapply-ai.onrender.com";
const BASE_URL = `${API_ORIGIN}/api/v1`;

import { getToken, clearSession } from "./auth";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    const current = typeof window !== "undefined" ? window.location.pathname : "";
    const next = current && current !== "/login" ? `?next=${encodeURIComponent(current)}&reason=expired` : "?reason=expired";
    if (typeof window !== "undefined") window.location.replace(`/login${next}`);
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  register: (email: string, password: string, full_name: string) =>
    request<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => request<Profile>("/profile"),

  updateProfile: (data: Partial<Profile>) =>
    request<Profile>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadResume: (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/resume/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then((r) => {
      if (r.status === 401) { clearSession(); window.location.replace("/login?reason=expired"); throw new Error("Session expired"); }
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    });
  },

  // Raw SSE stream for the onboarding chat. Caller reads response.body.
  chatStream: (message: string, history: { role: string; content: string }[], onboarding = false) =>
    fetch(`${BASE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ message, history, onboarding }),
    }),

  getApplications: (limit = 8) => request<ApplicationItem[]>(`/applications?limit=${limit}`),
  getApplicationStats: () => request<ApplicationStats>("/applications/stats"),

  raiseIssue: (payload: { name?: string; email?: string; category?: string; message: string }) =>
    fetch(`${BASE_URL}/support/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({ detail: "Failed" }));
        throw new Error(e.detail || "Failed to send");
      }
      return r.json();
    }),

  getAnswers: () => request<AnswerItem[]>("/answers"),
  updateAnswer: (id: string, answer_value: string) =>
    request<AnswerItem>(`/answers/${id}`, { method: "PUT", body: JSON.stringify({ answer_value }) }),
  deleteAnswer: (id: string) =>
    fetch(`${BASE_URL}/answers/${id}`, {
      method: "DELETE",
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    }).then((r) => { if (!r.ok && r.status !== 204) throw new Error("Delete failed"); }),

  getResumeStatus: () =>
    request<ResumeStatusItem[]>("/resume/status").then((list) => {
      const latest = list[0];
      if (!latest) return { has_resume: false } as ResumeStatus;
      return {
        has_resume: true,
        status: latest.status,
        file_name: latest.file_name,
        parsed_at: latest.parsed_at,
        fields_extracted: latest.fields_extracted,
        chunks_embedded: latest.chunks_embedded,
      } as ResumeStatus;
    }),
};

export interface Profile {
  id?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  location?: string;
  current_title?: string;
  current_company?: string;
  years_of_experience?: number;
  expected_salary?: string;
  notice_period?: string;
  work_authorization?: string;
  willing_to_relocate?: boolean;
  requires_sponsorship?: boolean;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  skills?: string[];
}

export interface ResumeStatusItem {
  status: string;
  file_name: string;
  parsed_at?: string;
  fields_extracted?: number;
  chunks_embedded?: number;
}

export interface ResumeStatus {
  has_resume: boolean;
  status?: string;
  file_name?: string;
  parsed_at?: string;
  fields_extracted?: number;
  chunks_embedded?: number;
}

export interface ApplicationItem {
  id: string;
  company?: string;
  job_title?: string;
  platform: string;
  job_url?: string;
  fields_filled: number;
  applied_at: string;
}

export interface ApplicationStats {
  total_applied: number;
  this_week: number;
  time_saved_minutes: number;
  fields_filled: number;
}

export interface AnswerItem {
  id: string;
  question_text: string;
  answer_value: string;
  canonical_key?: string | null;
  platform: string;
  times_used: number;
  updated_at: string;
}
