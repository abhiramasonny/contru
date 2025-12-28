import { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AnalyticsPage from './pages/AnalyticsPage';
import { getMe, logout, startAuth, type ApiUser } from './lib/api';

type View = 'landing' | 'auth' | 'dashboard' | 'analytics';

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getMe()
      .then((me) => {
        if (!isMounted) return;
        if (me) {
          setUser(me);
          if (currentView === 'landing' || currentView === 'auth') {
            setCurrentView('dashboard');
          }
        }
      })
      .finally(() => {
        if (isMounted) setAuthChecked(true);
      });
    return () => {
      isMounted = false;
    };
  }, [currentView]);

  const handleAuth = () => {
    startAuth();
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentView('landing');
  };

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            onGetStarted={() => setCurrentView('auth')}
            onAuth={handleAuth}
            isAuthenticated={Boolean(user)}
          />
        );
      case 'auth':
        return <AuthPage onAuth={handleAuth} />;
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onSignOut={handleLogout}
            onHome={() => setCurrentView('landing')}
            onAnalyze={(url: string) => {
              setAnalysisUrl(url);
              setCurrentView('analytics');
            }}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            user={user}
            documentUrl={analysisUrl}
            onSignOut={handleLogout}
            onHome={() => setCurrentView('landing')}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      default:
        return (
          <LandingPage
            onGetStarted={() => setCurrentView('auth')}
            onAuth={handleAuth}
            isAuthenticated={Boolean(user)}
          />
        );
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-black text-white"></div>;
  }

  return <div className="min-h-screen bg-black">{renderView()}</div>;
}

export default App;
