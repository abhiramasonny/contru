interface LandingPageProps {
  onGetStarted: () => void;
  onAuth: () => void;
  isAuthenticated: boolean;
}

export default function LandingPage({ onGetStarted, onAuth, isAuthenticated }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Contru</span>
        <button
          onClick={isAuthenticated ? onGetStarted : onAuth}
          className="px-4 py-2 text-sm font-medium bg-white text-black hover:bg-gray-100 transition-colors rounded-md"
        >
          {isAuthenticated ? 'Open dashboard' : 'Sign in'}
        </button>
      </div>

      <div className="h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div className="text-center max-w-3xl">
          <h1 className="text-[18vw] leading-none font-semibold mb-6 tracking-tight">
            Contru
          </h1>
          <p className="text-xl text-gray-400">
            Track contributions in Google Docs and Slides
          </p>
        </div>
      </div>
    </div>
  );
}
