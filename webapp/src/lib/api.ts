export interface ApiUser {
  name?: string;
  email?: string;
  picture?: string;
}

export interface Contributor {
  id?: string;
  name: string;
  email?: string | null;
  count: number;
}

export interface PermissionEntry {
  displayName?: string;
  emailAddress?: string;
  role?: string;
  type?: string;
}

export interface AnalysisData {
  file: {
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
  };
  year: number;
  contributors: Contributor[];
  heatmap: Record<string, number>;
  activityCount: number;
  streaks?: {
    longestStreak: number;
    currentStreak: number;
  };
  permissions?: PermissionEntry[];
}

function apiUrl(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

export function startAuth() {
  window.location.href = apiUrl("/auth/google");
}

export async function getMe() {
  const res = await fetch(apiUrl("/api/me"), {
    credentials: "include"
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as ApiUser;
}

export async function analyzeDocument(url: string, year: number) {
  const res = await fetch(apiUrl("/api/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, year })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to analyze");
  return data as AnalysisData;
}

export async function registerConsent() {
  const res = await fetch(apiUrl("/api/consent"), {
    method: "POST",
    credentials: "include"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to register");
  return data;
}

export async function logout() {
  await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include"
  });
}
