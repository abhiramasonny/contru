interface ContributionGraphProps {
  heatmap: Record<string, number>;
  year: number;
}

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ContributionGraph({ heatmap, year }: ContributionGraphProps) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const startDay = new Date(start);
  startDay.setDate(start.getDate() - start.getDay());
  const endDay = new Date(end);
  endDay.setDate(end.getDate() + (6 - end.getDay()));

  const days: { date: Date; value: number; inYear: boolean }[] = [];
  const max = Math.max(1, ...Object.values(heatmap));

  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const key = isoDay(d);
    const inYear = d.getFullYear() === year;
    const value = inYear ? heatmap[key] || 0 : 0;
    days.push({ date: new Date(d), value, inYear });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const intensityClasses = [
    'bg-gray-900/60',
    'bg-emerald-900',
    'bg-emerald-700',
    'bg-emerald-500',
    'bg-emerald-400',
  ];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => {
              const level = day.value === 0 ? 0 : Math.ceil((day.value / max) * 4);
              const key = isoDay(day.date);
              return (
                <div
                  key={key}
                  className={`w-3 h-3 rounded-sm ${
                    day.inYear ? intensityClasses[level] : 'bg-transparent'
                  } hover:ring-1 hover:ring-emerald-300/60 cursor-pointer transition-all`}
                  title={`${key}: ${day.value} activities`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
