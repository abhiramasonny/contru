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
  contributorHeatmaps?: Record<string, Record<string, number>>;
  activityCount: number;
  streaks?: {
    longestStreak: number;
    currentStreak: number;
  };
  permissions?: PermissionEntry[];
  timeline?: {
    date: string;
    count: number;
    topContributors?: string[];
  }[];
}

export interface HistoryActor {
  id: string;
  name: string;
  email?: string | null;
}

export interface HistoryTarget {
  title: string;
  type?: string | null;
  mimeType?: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp?: string | null;
  actionType: string;
  actors: HistoryActor[];
  targets: HistoryTarget[];
  details?: string[];
}

export interface HistorySummary {
  total: number;
  byAction: Record<string, number>;
  byActor: { name: string; count: number }[];
}

export interface DayHistory {
  day: string;
  items: HistoryItem[];
  summary: HistorySummary;
  nextPageToken?: string | null;
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

export async function analyzeDocument(url: string, year: number, force?: boolean) {
  const res = await fetch(apiUrl("/api/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, year, force: Boolean(force) })
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

export async function fetchDayHistory(
  url: string,
  day: string,
  pageToken?: string | null
) {
  const res = await fetch(apiUrl("/api/history/day"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, day, pageToken })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load history");
  return data as DayHistory;
}

export async function logout() {
  await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include"
  });
}
