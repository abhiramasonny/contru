import { User } from 'lucide-react';
import type { ApiUser } from '../lib/api';

interface NavbarProps {
  user?: ApiUser | null;
  onSignOut?: () => void;
  onHome?: () => void;
}

export default function Navbar({ user, onSignOut, onHome }: NavbarProps) {
  return (
    <nav className="border-b border-gray-900 bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onHome}
          className="text-lg font-semibold tracking-tight hover:text-blue-300 transition-colors"
        >
          Contru
        </button>
        <div className="flex items-center gap-3">
          {user?.email ? (
            <span className="text-xs text-gray-400">{user.email}</span>
          ) : null}
          {onSignOut ? (
            <button
              onClick={onSignOut}
              className="px-3 py-1 text-xs font-medium border border-gray-800 rounded-md hover:bg-gray-900 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors">
              <User className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
