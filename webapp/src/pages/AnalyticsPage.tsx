import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Download, UserCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import ContributionGraph from '../components/ContributionGraph';
import ContributionChart from '../components/ContributionChart';
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
    if (!data?.file?.modifiedTime) return '—';
    const date = new Date(data.file.modifiedTime);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }, [data]);

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
    <div className="min-h-screen bg-black text-white">
      <Navbar user={user} onSignOut={onSignOut} onHome={onHome} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-semibold mb-1">
            {data?.file?.name || 'Document analytics'}
          </h1>
          <p className="text-gray-500 text-sm">{documentUrl}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-gray-950 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Contributors</p>
            <h2 className="text-2xl font-semibold">{data?.contributors.length || 0}</h2>
          </div>
          <div className="bg-gray-950 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Activities</p>
            <h2 className="text-2xl font-semibold">{data?.activityCount || 0}</h2>
          </div>
          <div className="bg-gray-950 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Longest streak</p>
            <h2 className="text-2xl font-semibold">{data?.streaks?.longestStreak || 0}</h2>
          </div>
          <div className="bg-gray-950 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Last updated</p>
            <h2 className="text-2xl font-semibold">{modifiedLabel}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Your activity
          </div>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-950 rounded-lg p-6 md:p-10 mb-12">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-40 bg-gray-900 rounded"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 70 }).map((_, idx) => (
                  <div key={idx} className="h-3 w-3 rounded-sm bg-gray-900" />
                ))}
              </div>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : data ? (
            <div>
              <div className="w-full">
                {userHeatmap ? (
                  <>
                    <ContributionGraph
                      heatmap={userHeatmap}
                      year={data.year}
                      variant="lg"
                      className="hidden md:block mx-auto w-full md:w-[80vw] max-w-4xl"
                    />
                    <ContributionGraph
                      heatmap={userHeatmap}
                      year={data.year}
                      variant="sm"
                      className="md:hidden"
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    We could not map your identity yet. Register to see your activity.
                  </p>
                )}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-gray-300">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    Your activities
                  </p>
                  <h3 className="text-2xl font-semibold">{userStats.count}</h3>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Your rank</p>
                  <h3 className="text-2xl font-semibold">
                    {userStats.rank ? `#${userStats.rank}` : '—'}
                  </h3>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    Active days
                  </p>
                  <h3 className="text-2xl font-semibold">{quickStats.activeDays}</h3>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    Avg / active day
                  </p>
                  <h3 className="text-2xl font-semibold">{quickStats.avgPerActiveDay}</h3>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Paste a document link to see activity.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Group activity
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRescan}
              disabled={isRescanning || isLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-800 rounded-md hover:bg-gray-900 disabled:opacity-60"
            >
              {isRescanning ? 'Rescanning…' : 'Rescan'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-800 rounded-md hover:bg-gray-900"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-gray-950 rounded-lg p-6 mb-12">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-40 bg-gray-900 rounded"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 70 }).map((_, idx) => (
                  <div key={idx} className="h-3 w-3 rounded-sm bg-gray-900" />
                ))}
              </div>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : data ? (
            <ContributionGraph heatmap={data.heatmap} year={data.year} variant="md" />
          ) : (
            <p className="text-gray-500 text-sm">Paste a document link to see activity.</p>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Team contributions</h2>
          <div className="bg-gray-950 rounded-lg p-6">
            {isLoading ? (
              <div className="animate-pulse flex items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-gray-900" />
                <div className="space-y-2">
                  <div className="h-3 w-48 bg-gray-900 rounded" />
                  <div className="h-3 w-40 bg-gray-900 rounded" />
                  <div className="h-3 w-32 bg-gray-900 rounded" />
                </div>
              </div>
            ) : (
              <ContributionChart contributors={data?.contributors || []} />
            )}
          </div>
        </div>

        <details className="mb-6 bg-gray-950 rounded-lg border border-gray-900 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-200">
            Contributor details
          </summary>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {(data?.contributors || []).map((contributor) => (
              <div
                key={`${contributor.name}-${contributor.count}`}
                className="bg-gray-950 border border-gray-900 rounded-lg p-4"
              >
                <div className="font-medium">{contributor.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {contributor.email ? `${contributor.email} · ` : ''}
                  {contributor.count} activities
                </div>
              </div>
            ))}
          </div>
        </details>

        <details className="mb-12 bg-gray-950 rounded-lg border border-gray-900 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-200">
            People with access
          </summary>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {(data?.permissions || []).map((permission) => (
              <div
                key={`${permission.displayName || permission.emailAddress}-${permission.role}`}
                className="bg-gray-950 border border-gray-900 rounded-lg p-4"
              >
                <div className="font-medium">
                  {permission.displayName || permission.emailAddress || 'Unknown'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {permission.emailAddress ? `${permission.emailAddress} · ` : ''}
                  {permission.role || permission.type}
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="bg-gray-950 border border-gray-900 rounded-lg p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Register identity
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Each collaborator should sign in once so their name maps to activity.
            </p>
          </div>
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-60"
          >
            {isRegistering ? 'Registering…' : 'Register'}
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
