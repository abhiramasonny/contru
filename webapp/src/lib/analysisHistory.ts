export interface AnalysisHistoryEntry {
  url: string;
  year: number;
  fileName?: string;
  fileType?: string;
  modifiedTime?: string;
  activityCount: number;
  commitCount?: number;
  contributors: number;
  heatmap: Record<string, number>;
  userHeatmap?: Record<string, number>;
  updatedAt: string;
}

const STORAGE_KEY = 'contru-analysis-history';
const MAX_ENTRIES = 8;

export function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveAnalysisHistory(entry: AnalysisHistoryEntry) {
  if (typeof window === 'undefined') return;
  const existing = loadAnalysisHistory();
  const next = [
    entry,
    ...existing.filter((item) => !(item.url === entry.url && item.year === entry.year)),
  ];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ENTRIES)));
}
