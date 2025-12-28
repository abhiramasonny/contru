import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertOctagon,
  ArrowRightLeft,
  FilePlus,
  Link2,
  Loader2,
  MessageSquareText,
  PencilLine,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
} from 'lucide-react';
import { fetchDayHistory, type DayHistory, type HistoryItem } from '../lib/api';

interface VersionHistoryProps {
  documentUrl: string;
  heatmap?: Record<string, number>;
  isLoading?: boolean;
  error?: string;
}

const ACTION_META: Record<
  string,
  { label: string; icon: LucideIcon; badge: string; text: string }
> = {
  edit: {
    label: 'Edited content',
    icon: PencilLine,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  comment: {
    label: 'Comment activity',
    icon: MessageSquareText,
    badge: 'bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-300',
  },
  rename: {
    label: 'Renamed item',
    icon: Tag,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  move: {
    label: 'Moved item',
    icon: ArrowRightLeft,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  create: {
    label: 'Created item',
    icon: FilePlus,
    badge: 'bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-300',
  },
  delete: {
    label: 'Deleted item',
    icon: Trash2,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  restore: {
    label: 'Restored item',
    icon: RotateCcw,
    badge: 'bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-300',
  },
  permissionChange: {
    label: 'Permission change',
    icon: ShieldCheck,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  appliedLabelChange: {
    label: 'Label change',
    icon: Tag,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  settingsChange: {
    label: 'Settings change',
    icon: Settings,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  dlpChange: {
    label: 'Security update',
    icon: ShieldAlert,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  reference: {
    label: 'Referenced elsewhere',
    icon: Link2,
    badge: 'bg-blue-500/15 text-blue-300',
    text: 'text-blue-300',
  },
  unknown: {
    label: 'Other activity',
    icon: AlertOctagon,
    badge: 'bg-slate-500/15 text-slate-300',
    text: 'text-slate-300',
  },
};

function formatTime(value?: string | null) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function summarizeItems(items: HistoryItem[]) {
  const byAction: Record<string, number> = {};
  const byActor = new Map<string, { name: string; count: number }>();
  items.forEach((item) => {
    const key = item.actionType || 'unknown';
    byAction[key] = (byAction[key] || 0) + 1;
    item.actors.forEach((actor) => {
      const current = byActor.get(actor.id) || { name: actor.name, count: 0 };
      current.count += 1;
      byActor.set(actor.id, current);
    });
  });
  return {
    total: items.length,
    byAction,
    byActor: Array.from(byActor.values()).sort((a, b) => b.count - a.count),
  };
}

export default function VersionHistory({
  documentUrl,
  heatmap,
  isLoading,
  error,
}: VersionHistoryProps) {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [historyByDay, setHistoryByDay] = useState<Record<string, DayHistory>>({});
  const [loadingDays, setLoadingDays] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dayLimit, setDayLimit] = useState(20);

  const activityDays = useMemo(() => {
    if (!heatmap) return [];
    return Object.entries(heatmap)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, count]) => ({ day, count }));
  }, [heatmap]);

  const visibleDays = activityDays.slice(0, dayLimit);

  useEffect(() => {
    setExpandedDays([]);
    setHistoryByDay({});
    setLoadingDays({});
    setErrors({});
    setDayLimit(20);
  }, [documentUrl, heatmap]);

  const loadDay = async (day: string, pageToken?: string | null) => {
    if (!documentUrl || loadingDays[day]) return;
    setLoadingDays((prev) => ({ ...prev, [day]: true }));
    setErrors((prev) => ({ ...prev, [day]: '' }));
    try {
      const response = await fetchDayHistory(documentUrl, day, pageToken);
      setHistoryByDay((prev) => {
        const existing = prev[day];
        const mergedItems = pageToken && existing
          ? [...existing.items, ...response.items]
          : response.items;
        const summary = summarizeItems(mergedItems);
        return {
          ...prev,
          [day]: {
            ...response,
            items: mergedItems,
            summary,
          },
        };
      });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [day]: (err as Error).message }));
    } finally {
      setLoadingDays((prev) => ({ ...prev, [day]: false }));
    }
  };

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }
      return [...prev, day];
    });
    if (!historyByDay[day]) {
      void loadDay(day);
    }
  };

  const formatActors = (item: HistoryItem) => {
    if (!item.actors.length) return 'Unknown actor';
    const names = Array.from(new Set(item.actors.map((actor) => actor.name)));
    return names.join(', ');
  };

  const formatTargets = (item: HistoryItem) => {
    if (!item.targets.length) return 'Document';
    const titles = Array.from(new Set(item.targets.map((target) => target.title)));
    return titles.join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Version history</h2>
          <p className="text-sm text-slate-400">
            Day-by-day snapshots of Drive activity. Content diffs require stored snapshots.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {activityDays.length ? `${activityDays.length} active day(s)` : 'No activity yet'}
        </div>
      </div>

      <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-40 bg-slate-900 rounded"></div>
            <div className="h-3 w-72 bg-slate-900 rounded"></div>
            <div className="h-3 w-52 bg-slate-900 rounded"></div>
          </div>
        ) : error ? (
          <p className="text-sm text-blue-300">{error}</p>
        ) : visibleDays.length ? (
          <div className="grid grid-flow-col auto-cols-[minmax(360px,1fr)] gap-4 overflow-x-auto pb-3">
            {visibleDays.map((entry) => {
              const dayData = historyByDay[entry.day];
              const isExpanded = expandedDays.includes(entry.day);
              const summary = dayData?.summary;
              const topActions = summary
                ? Object.entries(summary.byAction)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                : [];
              const topActors = summary?.byActor?.slice(0, 3) || [];

              return (
                <div
                  key={entry.day}
                  className="border border-slate-800/70 rounded-xl p-5 bg-slate-950/40 min-w-[360px] lg:min-w-[420px] xl:min-w-[480px] min-h-[190px]"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200">{entry.day}</div>
                        <div className="text-xs text-slate-500">{entry.count} activities</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleDay(entry.day)}
                      className="px-3 py-2 text-xs border border-slate-800 rounded-md hover:bg-slate-900 w-full text-left"
                    >
                      {isExpanded ? 'Hide details' : 'Load details'}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 space-y-3">
                      {loadingDays[entry.day] ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading activity...
                        </div>
                      ) : errors[entry.day] ? (
                        <p className="text-xs text-blue-300">{errors[entry.day]}</p>
                      ) : dayData ? (
                        <>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                            <span>{dayData.items.length} events loaded</span>
                            {topActions.length ? (
                              <span>
                                {' | '}Top actions:{' '}
                                {topActions
                                  .map(([action, count]) => `${action} (${count})`)
                                  .join(', ')}
                              </span>
                            ) : null}
                            {topActors.length ? (
                              <span>
                                {' | '}Top people: {topActors.map((actor) => actor.name).join(', ')}
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {dayData.items.map((item) => {
                              const meta = ACTION_META[item.actionType] || ACTION_META.unknown;
                              const Icon = meta.icon;
                              return (
                                <div
                                  key={item.id}
                                  className="border border-slate-800/70 rounded-lg p-3 bg-slate-950/70"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={`w-9 h-9 rounded-md flex items-center justify-center ${meta.badge}`}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-sm font-medium text-slate-200">
                                          {meta.label}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {formatTime(item.timestamp)}
                                        </div>
                                      </div>
                                      <div className="text-xs text-slate-400 mt-1">
                                        <span className={meta.text}>{formatActors(item)}</span>
                                        <span className="text-slate-600"> | </span>
                                        <span>{formatTargets(item)}</span>
                                      </div>
                                      {item.details?.length ? (
                                        <div className="text-xs text-slate-500 mt-2">
                                          {item.details.join(' | ')}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {dayData.nextPageToken ? (
                            <button
                              onClick={() =>
                                loadDay(entry.day, dayData.nextPageToken || undefined)
                              }
                              className="mt-2 px-3 py-2 text-xs border border-slate-800 rounded-md hover:bg-slate-900 w-full"
                            >
                              Load more events
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">No activity details found.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {dayLimit < activityDays.length ? (
              <button
                onClick={() => setDayLimit((prev) => prev + 20)}
                className="px-3 py-2 text-xs border border-slate-800 rounded-md hover:bg-slate-900 h-full"
              >
                Show more days
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No activity history yet.</p>
        )}
      </div>
    </div>
  );
}
