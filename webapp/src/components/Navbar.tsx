import { User } from 'lucide-react';
import type { ApiUser } from '../lib/api';

interface NavbarProps {
  user?: ApiUser | null;
  onSignOut?: () => void;
  onHome?: () => void;
}

export default function Navbar({ user, onSignOut, onHome }: NavbarProps) {
  return (
    <nav className="border-b border-slate-800/70 bg-[#0b0f14]/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onHome}
          className="text-lg font-semibold tracking-tight hover:text-emerald-300 transition-colors"
        >
          Contru
        </button>
        <div className="flex items-center gap-3">
          {user?.email ? (
            <span className="text-xs text-slate-400">{user.email}</span>
          ) : null}
          {onSignOut ? (
            <button
              onClick={onSignOut}
              className="px-3 py-1 text-xs font-medium border border-slate-800 rounded-md hover:bg-slate-900 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
