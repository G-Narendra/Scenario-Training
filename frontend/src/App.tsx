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
import { ProgressPage } from './pages/ProgressPage';
import { AdminConsolePage } from './pages/AdminConsolePage';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'tracks' | 'scenarios' | 'chat' | 'evaluation' | 'progress' | 'admin'>('tracks');
  const [selectedTrack, setSelectedTrack] = useState<string>('sales');
  const [activeSession, setActiveSession] = useState<SimulationSession | null>(null);
  const [evalSessionId, setEvalSessionId] = useState<string | null>(null);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090D16] text-indigo-400">
        <div className="flex items-center space-x-3 text-sm font-semibold">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span>Loading ScenarioLab...</span>
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
    setEvalSessionId(sessionId);
    setCurrentView('evaluation');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
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

        {currentView === 'evaluation' && (evalSessionId || activeSession) && (
          <FeedbackReportPage
            sessionId={evalSessionId || activeSession!.id}
            onBackToScenarios={() => setCurrentView('scenarios')}
            onRetryScenario={(scenId) => handleLaunchSimulation(scenId, 'text')}
          />
        )}

        {currentView === 'progress' && (
          <ProgressPage
            onSelectScenario={(scenId) => handleLaunchSimulation(scenId, 'text')}
            onViewSessionEvaluation={handleViewEvaluation}
          />
        )}

        {currentView === 'admin' && (
          <AdminConsolePage />
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
