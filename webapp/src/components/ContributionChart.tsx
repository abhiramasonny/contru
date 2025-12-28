import type { Contributor } from '../lib/api';

interface ContributionChartProps {
  contributors: Contributor[];
}

export default function ContributionChart({ contributors }: ContributionChartProps) {
  const total = contributors.reduce((sum, item) => sum + item.count, 0);
  const top = contributors.slice(0, 8);

  if (!contributors.length) {
    return <p className="text-sm text-gray-500">No contribution data yet.</p>;
  }

  return (
    <div className="w-full space-y-4">
      {top.map((item) => {
        const percent = total ? Math.round((item.count / total) * 100) : 0;
        const label = item.email ? `${item.name} · ${item.email}` : item.name;
        return (
          <div key={`${item.id || item.email || item.name}-${item.count}`} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span className="truncate">{label}</span>
              <span>{item.count} · {percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-900">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${Math.max(percent, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
