import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  GitGraph,
  UserCheck,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ContributionGraph from '../components/ContributionGraph';
import ContributionChart from '../components/ContributionChart';
import ContributionBreakdown from '../components/ContributionBreakdown';
import VersionHistory from '../components/VersionHistory';
import {
  analyzeDocument,
  registerConsent,
  type AnalysisData,
  type ApiUser,
} from '../lib/api';
import { saveAnalysisHistory } from '../lib/analysisHistory';

interface AnalyticsPageProps {
  onBack: () => void;
  documentUrl: string;
  onSignOut: () => void;
  onHome: () => void;
  user: ApiUser | null;
  initialYear?: number;
}

export default function AnalyticsPage({
  onBack,
  documentUrl,
  onSignOut,
  onHome,
  user,
  initialYear,
}: AnalyticsPageProps) {
  const chicagoTimeZone = 'America/Chicago';
  const formatDayLabel = (day: string) => {
    const date = new Date(`${day}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return day;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: chicagoTimeZone,
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => current - idx);
  }, []);

  useEffect(() => {
    if (!documentUrl) return;
    setIsLoading(true);
    setError('');
    analyzeDocument(documentUrl, year)
      .then((response) => {
        setData(response);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [documentUrl, year]);

  const userStats = useMemo(() => {
    if (!data || !user) return { count: 0, rank: null };
    const sorted = [...data.contributors].sort((a, b) => b.count - a.count);
    const entry =
      sorted.find((c) => c.email && user.email && c.email === user.email) ||
      sorted.find((c) => user.name && c.name === user.name);
    if (!entry) return { count: 0, rank: null };
    const rank = sorted.findIndex((c) => c === entry) + 1;
    return { count: entry.count, rank };
  }, [data, user]);

  const userKey = useMemo(() => {
    if (!data || !user) return null;
    const match =
      data.contributors.find((c) => c.email && user.email && c.email === user.email) ||
      data.contributors.find((c) => user.name && c.name === user.name) ||
      null;
    return match?.id || null;
  }, [data, user]);

  const userHeatmap = useMemo(() => {
    if (!data?.contributorHeatmaps || !userKey) return null;
    return data.contributorHeatmaps[userKey] || null;
  }, [data, userKey]);

  const quickStats = useMemo(() => {
    if (!data) {
      return { activeDays: 0, avgPerActiveDay: 0 };
    }
    const values = Object.values(data.heatmap || {});
    const activeDays = values.filter((value) => value > 0).length;
    const avgPerActiveDay = activeDays
      ? Number((data.activityCount / activeDays).toFixed(1))
      : 0;
    return { activeDays, avgPerActiveDay };
  }, [data]);

  const modifiedLabel = useMemo(() => {
    if (!data?.file?.modifiedTime) return '-';
    const date = new Date(data.file.modifiedTime);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: chicagoTimeZone,
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  }, [data, chicagoTimeZone]);

  const timelineMax = useMemo(() => {
    if (!data?.timeline?.length) return 1;
    return Math.max(1, ...data.timeline.map((entry) => entry.count));
  }, [data]);

  const embedUrl = useMemo(() => {
    if (!documentUrl) return null;
    const match = documentUrl.match(/\/(document|presentation|spreadsheets)\/d\/([-\w]+)/);
    if (match) {
      const id = match[2];
      const type = match[1];
      if (type === 'document') {
        return `https://docs.google.com/document/d/${id}/preview`;
      }
      if (type === 'presentation') {
        return `https://docs.google.com/presentation/d/${id}/preview`;
      }
      if (type === 'spreadsheets') {
        return `https://docs.google.com/spreadsheets/d/${id}/preview`;
      }
    }
    if (documentUrl.includes('/edit')) {
      return documentUrl.replace(/\/edit.*$/, '/preview');
    }
    return documentUrl;
  }, [documentUrl]);

  useEffect(() => {
    if (!data || !documentUrl) return;
    saveAnalysisHistory({
      url: documentUrl,
      year: data.year,
      fileName: data.file?.name,
      fileType: data.file?.mimeType,
      modifiedTime: data.file?.modifiedTime,
      activityCount: data.activityCount,
      contributors: data.contributors.length,
      heatmap: data.heatmap,
      userHeatmap: userHeatmap || undefined,
      updatedAt: new Date().toISOString(),
    });
  }, [data, documentUrl, userHeatmap]);

  const handleExport = () => {
    if (!data) return;
    const rows = [['Name', 'Email', 'Activities']];
    data.contributors.forEach((c) => {
      rows.push([c.name, c.email || '', String(c.count)]);
    });
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.file?.name || 'contributors'}-${data.year}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await registerConsent();
      alert('Registered. Re-run analyze to refresh names.');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRescan = async () => {
    if (!documentUrl) return;
    setIsRescanning(true);
    setError('');
    try {
      const response = await analyzeDocument(documentUrl, year, true);
      setData(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <div className="min-h-screen text-white">
      <Navbar user={user} onSignOut={onSignOut} onHome={onHome} />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRescan}
              disabled={isRescanning || isLoading}
              className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-800 rounded-md hover:bg-slate-900 disabled:opacity-60"
            >
              {isRescanning ? 'Rescanning...' : 'Rescan'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-800 rounded-md hover:bg-slate-900"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 animate-fade-up">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Document repository
              </p>
              <h1 className="text-3xl font-semibold mt-2">
                {data?.file?.name || 'Document analytics'}
              </h1>
              <p className="text-xs text-slate-400 mt-2 break-all">{documentUrl}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <GitBranch className="w-3.5 h-3.5" />
                {year}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-slate-300">
                <GitCommit className="w-3.5 h-3.5" />
                {data?.activityCount || 0} commits
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-slate-300">
                <Users className="w-3.5 h-3.5" />
                {data?.contributors.length || 0} authors
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-slate-300">
                <Clock className="w-3.5 h-3.5" />
                Updated {modifiedLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-6 mt-8">
          <aside className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                <GitGraph className="w-3.5 h-3.5 text-emerald-400" />
                Repo stats
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Contributors
                  </span>
                  <span className="font-semibold text-slate-200">
                    {data?.contributors.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Activities
                  </span>
                  <span className="font-semibold text-slate-200">
                    {data?.activityCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <GitCommit className="w-4 h-4 text-emerald-400" />
                    Longest streak
                  </span>
                  <span className="font-semibold text-slate-200">
                    {data?.streaks?.longestStreak || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Active days
                  </span>
                  <span className="font-semibold text-slate-200">
                    {quickStats.activeDays}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <GitGraph className="w-3.5 h-3.5 text-emerald-400" />
                Group heatmap
              </div>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-32 bg-slate-900 rounded"></div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 42 }).map((_, idx) => (
                      <div key={idx} className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <p className="text-xs text-blue-300">{error}</p>
              ) : data ? (
                <ContributionGraph heatmap={data.heatmap} year={data.year} variant="sm" />
              ) : (
                <p className="text-xs text-slate-500">Paste a document link to see activity.</p>
              )}
            </div>

            <ContributionBreakdown contributors={data?.contributors || []} />

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Team share
              </div>
              {isLoading ? (
                <div className="animate-pulse flex items-center gap-6">
                  <div className="w-28 h-28 rounded-full bg-slate-900" />
                  <div className="space-y-2">
                    <div className="h-3 w-40 bg-slate-900 rounded" />
                    <div className="h-3 w-32 bg-slate-900 rounded" />
                    <div className="h-3 w-24 bg-slate-900 rounded" />
                  </div>
                </div>
              ) : (
                <div className="max-w-full overflow-hidden">
                  <ContributionChart contributors={data?.contributors || []} />
                </div>
              )}
            </div>
          </aside>

          <main className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Live document preview
                </div>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Drive
                </a>
              </div>
              <div className="mt-4">
                {embedUrl ? (
                  <iframe
                    title="Document preview"
                    src={embedUrl}
                    className="w-full h-[60vh] rounded-xl border border-slate-800/60 bg-black"
                  />
                ) : (
                  <div className="text-sm text-slate-500">
                    Preview unavailable. Open the document in Drive.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <GitGraph className="w-4 h-4 text-emerald-400" />
                  Your activity
                </div>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-200"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 w-40 bg-slate-900 rounded"></div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 70 }).map((_, idx) => (
                      <div key={idx} className="h-3 w-3 rounded-sm bg-slate-900" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <p className="text-blue-300 text-sm">{error}</p>
              ) : data ? (
                <div>
                  <div className="w-full">
                    {userHeatmap ? (
                      <>
                        <ContributionGraph
                          heatmap={userHeatmap}
                          year={data.year}
                          variant="lg"
                          className="hidden md:block mx-auto w-full"
                        />
                        <ContributionGraph
                          heatmap={userHeatmap}
                          year={data.year}
                          variant="sm"
                          className="md:hidden"
                        />
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        We could not map your identity yet. Register to see your activity.
                      </p>
                    )}
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-slate-300">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                        Your activities
                      </p>
                      <h3 className="text-2xl font-semibold">{userStats.count}</h3>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                        Your rank
                      </p>
                      <h3 className="text-2xl font-semibold">
                        {userStats.rank ? `#${userStats.rank}` : '-'}
                      </h3>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                        Active days
                      </p>
                      <h3 className="text-2xl font-semibold">{quickStats.activeDays}</h3>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                        Avg per active day
                      </p>
                      <h3 className="text-2xl font-semibold">{quickStats.avgPerActiveDay}</h3>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Paste a document link to see activity.</p>
              )}
            </div>
          </main>

          <aside className="space-y-6 min-w-0">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                Commit log
              </div>
              {data?.timeline?.length ? (
                <div className="space-y-4">
                  {data.timeline.map((entry, index) => {
                    const width = Math.round((entry.count / timelineMax) * 100);
                    return (
                      <div
                        key={entry.date}
                        className="relative pl-6 animate-fade-up"
                        style={{ animationDelay: `${index * 35}ms` }}
                      >
                        <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-glow" />
                        <div className="text-xs text-slate-500">
                          {formatDayLabel(entry.date)}
                        </div>
                        <div className="text-sm font-medium text-slate-200">
                          {entry.count} commits
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.topContributors?.length
                            ? `Top: ${entry.topContributors.join(', ')}`
                            : 'No named contributors'}
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400/80"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No activity history yet.</p>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <VersionHistory
            documentUrl={documentUrl}
            heatmap={data?.heatmap}
            isLoading={isLoading}
            error={error}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-10">
          <details className="bg-slate-950/60 rounded-xl border border-slate-800/70 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-200">
              Contributor details
            </summary>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {(data?.contributors || []).map((contributor) => (
                <div
                  key={`${contributor.name}-${contributor.count}`}
                  className="bg-slate-950/70 border border-slate-800/70 rounded-lg p-4"
                >
                  <div className="font-medium">{contributor.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {contributor.email ? `${contributor.email} | ` : ''}
                    {contributor.count} activities
                  </div>
                </div>
              ))}
            </div>
          </details>

          <details className="bg-slate-950/60 rounded-xl border border-slate-800/70 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-200">
              People with access
            </summary>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {(data?.permissions || []).map((permission) => (
                <div
                  key={`${permission.displayName || permission.emailAddress}-${permission.role}`}
                  className="bg-slate-950/70 border border-slate-800/70 rounded-lg p-4"
                >
                  <div className="font-medium">
                    {permission.displayName || permission.emailAddress || 'Unknown'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {permission.emailAddress ? `${permission.emailAddress} | ` : ''}
                    {permission.role || permission.type}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="mt-8 bg-slate-950/60 border border-slate-800/70 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Register identity
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Each collaborator should sign in once so their name maps to activity.
            </p>
          </div>
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-60"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeCsv(value: string) {
  const safe = String(value ?? '');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
