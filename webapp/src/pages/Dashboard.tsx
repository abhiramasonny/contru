import { useState } from 'react';
import { Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import type { ApiUser } from '../lib/api';

interface DashboardProps {
  onAnalyze: (url: string) => void;
  onSignOut: () => void;
  user: ApiUser | null;
  onHome: () => void;
}

export default function Dashboard({ onAnalyze, onSignOut, user, onHome }: DashboardProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      onAnalyze(url);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar user={user} onSignOut={onSignOut} onHome={onHome} />

      <div className="max-w-2xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold mb-3">Analyze a document</h1>
          <p className="text-gray-400">Paste a Google Docs or Slides link</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-md focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white placeholder-gray-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-md bg-white text-black font-medium hover:bg-gray-100 transition-colors"
          >
            Analyze
          </button>
        </form>
      </div>
    </div>
  );
}
