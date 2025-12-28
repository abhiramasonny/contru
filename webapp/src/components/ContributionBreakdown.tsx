import type { Contributor } from '../lib/api';

interface ContributionBreakdownProps {
  contributors: Contributor[];
}

export default function ContributionBreakdown({ contributors }: ContributionBreakdownProps) {
  if (!contributors.length) {
    return <p className="text-sm text-gray-500">No contribution data yet.</p>;
  }

  const top = contributors.slice(0, 8);
  const max = Math.max(1, ...top.map((item) => item.count));

  return (
    <div className="bg-gray-950 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-6">Contribution breakdown</h3>
      <div className="space-y-3">
        {top.map((item) => {
          const width = Math.round((item.count / max) * 100);
          return (
            <div key={`${item.id || item.email || item.name}-${item.count}`}>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="truncate max-w-[70%]">{item.name}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400/80"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
