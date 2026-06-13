const BASE_URL = "http://localhost:8000/api/v1";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

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
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    });
  },

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
