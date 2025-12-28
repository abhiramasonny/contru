import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  color: 'green' | 'blue' | 'orange' | 'yellow';
}

export default function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    green: 'text-[#7ee787] bg-[#238636]/10',
    blue: 'text-[#58a6ff] bg-[#388bfd]/10',
    orange: 'text-[#f0883e] bg-[#9e6a03]/10',
    yellow: 'text-[#ffd700] bg-[#9e6a03]/10',
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-[#8b949e]">{label}</div>
    </div>
  );
}
