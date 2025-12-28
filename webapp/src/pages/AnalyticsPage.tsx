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

interface AnalyticsPageProps {
  onBack: () => void;
  documentUrl: string;
  onSignOut: () => void;
  user: ApiUser | null;
}

export default function AnalyticsPage({
  onBack,
  documentUrl,
  onSignOut,
  user,
}: AnalyticsPageProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar user={user} onSignOut={onSignOut} />

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

        <div className="bg-gray-950 rounded-lg p-6 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Contributors</p>
              <h2 className="text-3xl font-semibold">{data?.contributors.length || 0}</h2>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Activities</p>
              <h2 className="text-3xl font-semibold">{data?.activityCount || 0}</h2>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Longest streak</p>
              <h2 className="text-3xl font-semibold">{data?.streaks?.longestStreak || 0}</h2>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Current streak</p>
              <h2 className="text-3xl font-semibold">{data?.streaks?.currentStreak || 0}</h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Activity
          </div>
          <div className="flex items-center gap-3">
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
            <p className="text-gray-500 text-sm">Analyzing activity…</p>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : data ? (
            <ContributionGraph heatmap={data.heatmap} year={data.year} />
          ) : (
            <p className="text-gray-500 text-sm">Paste a document link to see activity.</p>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Team contributions</h2>
          <div className="bg-gray-950 rounded-lg p-6">
            <ContributionChart contributors={data?.contributors || []} />
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Contributor details</h2>
          <div className="grid md:grid-cols-2 gap-3">
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
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">People with access</h2>
          <div className="grid md:grid-cols-2 gap-3">
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
        </div>

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
