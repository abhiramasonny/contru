import type { Contributor } from '../lib/api';

interface ContributionChartProps {
  contributors: Contributor[];
}

const COLORS = ['#1f6feb', '#22c55e', '#0ea5e9', '#16a34a', '#38bdf8', '#4ade80'];

export default function ContributionChart({ contributors }: ContributionChartProps) {
  if (!contributors.length) {
    return <p className="text-sm text-slate-500">No contribution data yet.</p>;
  }

  const total = contributors.reduce((sum, item) => sum + item.count, 0);
  const slices = contributors.slice(0, 6).map((item, index) => ({
    label: item.email ? `${item.name} | ${item.email}` : item.name,
    value: item.count,
    color: COLORS[index % COLORS.length],
    key: `${item.id || item.email || item.name}-${item.count}`,
  }));

  const remainder = contributors.slice(6).reduce((sum, item) => sum + item.count, 0);
  if (remainder > 0) {
    slices.push({
      label: 'Others',
      value: remainder,
      color: '#6b7280',
      key: 'others',
    });
  }

  let cumulative = 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <svg width="160" height="160" viewBox="0 0 180 180" className="shrink-0">
        {slices.map((slice, index) => {
          const fraction = total ? slice.value / total : 0;
          const dash = fraction * circumference;
          const offset = cumulative * circumference;
          cumulative += fraction;
          return (
            <circle
              key={slice.key}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="26"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 90 90)`}
            />
          );
        })}
        <circle cx="90" cy="90" r="44" fill="#0b1118" />
        <text
          x="90"
          y="90"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e5e7eb"
          fontSize="14"
          fontWeight="600"
        >
          {total}
        </text>
        </svg>
        <div className="flex-1 space-y-3 text-sm min-w-0">
          {slices.map((slice) => {
            const percent = total ? Math.round((slice.value / total) * 100) : 0;
            return (
              <div
                key={slice.key}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-slate-300"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.label}</span>
                <span className="text-slate-500">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-900">
        <div className="h-1 w-2/3 rounded-full bg-emerald-500/80" />
      </div>
    </div>
  );
}
