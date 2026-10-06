import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { TrackPickerPage } from './pages/TrackPickerPage';
import { ScenarioLibraryPage } from './pages/ScenarioLibraryPage';
import { SimulationChatPage } from './pages/SimulationChatPage';
import { FeedbackReportPage } from './pages/FeedbackReportPage';
import { api } from './api/client';
import { SimulationSession } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'tracks' | 'scenarios' | 'chat' | 'evaluation' | 'admin'>('tracks');
  const [selectedTrack, setSelectedTrack] = useState<string>('sales');
  const [activeSession, setActiveSession] = useState<SimulationSession | null>(null);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-cyan-400">
        <div className="flex items-center space-x-3 font-mono text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span>INITIALIZING FLIGHT SIMULATOR...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectTrack = (trackKey: string) => {
    setSelectedTrack(trackKey);
    setCurrentView('scenarios');
  };

  const handleLaunchSimulation = async (scenarioId: string, mode: 'text' | 'voice') => {
    setIsStartingSimulation(true);
    try {
      const session = await api.createSession(scenarioId, mode);
      setActiveSession(session);
      setCurrentView('chat');
    } catch (err) {
      console.error('Failed to create simulation session', err);
    } finally {
      setIsStartingSimulation(false);
    }
  };

  const handleSessionEnded = (session: SimulationSession) => {
    setActiveSession(session);
  };

  const handleViewEvaluation = (sessionId: string) => {
    console.log('Navigating to evaluation for session:', sessionId);
    setCurrentView('evaluation');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar currentView={currentView} onNavigate={(v) => setCurrentView(v as any)} />

      <main className="flex-1">
        {currentView === 'tracks' && (
          <TrackPickerPage onSelectTrack={handleSelectTrack} />
        )}

        {currentView === 'scenarios' && (
          <ScenarioLibraryPage
            selectedTrack={selectedTrack}
            onBackToTracks={() => setCurrentView('tracks')}
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

        {currentView === 'evaluation' && activeSession && (
          <FeedbackReportPage
            sessionId={activeSession.id}
            onBackToScenarios={() => setCurrentView('scenarios')}
            onRetryScenario={(scenId) => handleLaunchSimulation(scenId, 'text')}
          />
        )}

        {currentView === 'admin' && (
          <div className="mx-auto max-w-5xl py-16 px-4 text-center">
            <h2 className="text-3xl font-bold text-white">Admin Management Console</h2>
            <p className="mt-3 text-slate-400">
              Cohort and scenario content management console configured.
            </p>
            <button
              onClick={() => setCurrentView('tracks')}
              className="mt-6 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              Return to Flight Deck
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
