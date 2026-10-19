import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { TrackPickerPage } from './pages/TrackPickerPage';
import { ScenarioLibraryPage } from './pages/ScenarioLibraryPage';
import { SimulationChatPage } from './pages/SimulationChatPage';
import { FeedbackReportPage } from './pages/FeedbackReportPage';
import { api } from './api/client';
import { SimulationSession } from './types';
import { ProgressPage } from './pages/ProgressPage';
import { AdminConsolePage } from './pages/AdminConsolePage';

export type ViewMode = 'tracks' | 'scenarios' | 'chat' | 'evaluation' | 'progress' | 'admin';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('scenarios');
  const [selectedTrack, setSelectedTrack] = useState<string>('leadership');
  const [activeSession, setActiveSession] = useState<SimulationSession | null>(null);
  const [evalSessionId, setEvalSessionId] = useState<string | null>(null);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [attemptLimitMessage, setAttemptLimitMessage] = useState<string | null>(null);

  const navigateTo = (view: ViewMode, track?: string, replace = false) => {
    if (track) setSelectedTrack(track);
    setCurrentView(view);
    const hash = '#' + view;
    const stateObj = { view, selectedTrack: track || selectedTrack };
    if (replace) {
      window.history.replaceState(stateObj, '', hash);
    } else {
      window.history.pushState(stateObj, '', hash);
    }
  };

  React.useEffect(() => {
    const validViews: ViewMode[] = ['tracks', 'scenarios', 'chat', 'evaluation', 'progress', 'admin'];
    const hashView = window.location.hash.replace('#', '') as ViewMode;
    if (hashView && validViews.includes(hashView)) {
      setCurrentView(hashView);
      window.history.replaceState({ view: hashView, selectedTrack }, '', '#' + hashView);
    } else {
      window.history.replaceState({ view: 'scenarios', selectedTrack }, '', '#scenarios');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
        if (e.state.selectedTrack) {
          setSelectedTrack(e.state.selectedTrack);
        }
      } else {
        const h = window.location.hash.replace('#', '') as ViewMode;
        if (h && validViews.includes(h)) {
          setCurrentView(h);
        } else {
          setCurrentView('scenarios');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    if (user && user.role !== 'group_admin' && user.role !== 'super_admin' && currentView === 'admin') {
      navigateTo('scenarios', undefined, true);
    }
  }, [user, currentView]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0B192C] text-slate-800 dark:text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <img
            src="/logo_3h_solutions.webp"
            alt="3H Solutions"
            className="w-16 h-16 object-contain rounded-2xl overflow-hidden shadow-sm animate-pulse"
          />
          <div className="flex items-center space-x-3 text-sm font-semibold text-[#1E3E62] dark:text-slate-200">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6500] border-t-transparent" />
            <span>Loading 3H Solutions Scenario Training...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectTrack = (trackKey: string) => {
    navigateTo('scenarios', trackKey);
  };

  const handleLaunchSimulation = async (scenarioId: string, mode: 'text' | 'voice') => {
    setIsStartingSimulation(true);
    try {
      const session = await api.createSession(scenarioId, mode);
      setActiveSession(session);
      navigateTo('chat');
    } catch (err: unknown) {
      console.error('Failed to create practice session', err);
      const errorObj = err as { status?: number; message?: string };
      const msg = errorObj?.message || 'Unable to start scenario.';
      if (errorObj?.status === 429 || msg.includes('ATTEMPT_LIMIT_REACHED')) {
        setAttemptLimitMessage(
          'You have completed your 5 assigned scenario practice runs for this cohort. Please wait for the trainer’s next instruction or review your past debrief.'
        );
      } else {
        alert(msg);
      }
    } finally {
      setIsStartingSimulation(false);
    }
  };

  const handleSessionEnded = (session: SimulationSession) => {
    setActiveSession(session);
  };

  const handleViewEvaluation = (sessionId: string) => {
    setEvalSessionId(sessionId);
    navigateTo('evaluation');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090D16] dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      <Navbar currentView={currentView} onNavigate={(v) => navigateTo(v as ViewMode)} />

      <main className="flex-1">
        {currentView === 'tracks' && (
          <TrackPickerPage onSelectTrack={handleSelectTrack} />
        )}

        {currentView === 'scenarios' && (
          <ScenarioLibraryPage
            selectedTrack={selectedTrack}
            onBackToTracks={() => navigateTo('tracks')}
            onLaunchSimulation={handleLaunchSimulation}
            isStarting={isStartingSimulation}
          />
        )}

        {currentView === 'chat' && activeSession && (
          <SimulationChatPage
            session={activeSession}
            onSessionEnded={handleSessionEnded}
            onViewEvaluation={handleViewEvaluation}
          />
        )}

        {currentView === 'evaluation' && (evalSessionId || activeSession) && (
          <FeedbackReportPage
            sessionId={evalSessionId || activeSession!.id}
            onBackToScenarios={() => navigateTo('scenarios')}
            onRetryScenario={(scenId) => handleLaunchSimulation(scenId, 'text')}
            onNavigateProgress={() => navigateTo('progress')}
          />
        )}

        {currentView === 'progress' && (
          <ProgressPage
            onSelectScenario={(scenId) => handleLaunchSimulation(scenId, 'text')}
            onViewSessionEvaluation={handleViewEvaluation}
          />
        )}

        {currentView === 'admin' && (user?.role === 'group_admin' || user?.role === 'super_admin') && (
          <AdminConsolePage onViewEvaluation={handleViewEvaluation} />
        )}

        {/* Anti-Abuse Max 2 Attempts Modal */}
        {attemptLimitMessage && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/75 dark:bg-[#0B192C]/85 backdrop-blur-sm" onClick={() => setAttemptLimitMessage(null)} />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#FF6500] bg-white dark:bg-[#112240] p-6 shadow-2xl z-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6500]/15 text-[#FF6500] mb-4 border border-[#FF6500]/30">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-heading">
                Practice Limit Reached
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {attemptLimitMessage}
              </p>
              <div className="mt-6 flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setAttemptLimitMessage(null);
                    navigateTo('scenarios');
                  }}
                  className="w-full rounded-xl bg-[#FF6500] hover:bg-[#E05A00] py-2.5 text-sm font-bold text-white shadow-md transition"
                >
                  Return to Scenarios
                </button>
                <button
                  onClick={() => {
                    setAttemptLimitMessage(null);
                    navigateTo('progress');
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition"
                >
                  View Past Attempt Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
