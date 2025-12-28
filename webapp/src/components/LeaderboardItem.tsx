interface LeaderboardItemProps {
  rank: number;
  name: string;
  contributions: number;
  isYou?: boolean;
}

export default function LeaderboardItem({
  rank,
  name,
  contributions,
  isYou,
}: LeaderboardItemProps) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
        isYou ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-gray-900/50'
      }`}
    >
      <div className="text-gray-500 font-medium w-6 text-right">#{rank}</div>
      <div className="flex-1">
        <div className="font-medium">{name}</div>
      </div>
      <div className="text-gray-400 text-sm">{contributions}</div>
    </div>
  );
}
