import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { ScenarioDetail, SessionMessage, SimulationSession } from '../types';
import { VoiceClient } from '../voice/voiceClient';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Hand,
  Info,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Send,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';

interface SimulationChatPageProps {
  session: SimulationSession;
  onSessionEnded: (session: SimulationSession) => void;
  onViewEvaluation: (sessionId: string) => void;
}

export const SimulationChatPage: React.FC<SimulationChatPageProps> = ({
  session: initialSession,
  onSessionEnded,
  onViewEvaluation,
}) => {
  const [session, setSession] = useState<SimulationSession>(initialSession);
  const [scenarioDetail, setScenarioDetail] = useState<ScenarioDetail | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>(initialSession.messages || []);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'persona' | 'brief' | 'rubric'>('persona');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showEndConfirm) {
        setShowEndConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEndConfirm]);

  // Voice Mode State
  const [voiceClient, setVoiceClient] = useState<VoiceClient | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [voicePartial, setVoicePartial] = useState('');
  const [voiceLatencyMs, setVoiceLatencyMs] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Scenario Specification (Persona, Brief, Rubric Skills)
  useEffect(() => {
    if (!session.scenario_id) return;
    api.getScenarioDetail(session.scenario_id)
      .then((detail) => setScenarioDetail(detail))
      .catch((err) => console.error('Failed to load scenario details', err));
  }, [session.scenario_id]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingReply, voicePartial]);

  // Elapsed timer
  useEffect(() => {
    if (session.status !== 'active') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [session.status]);

  // Initialize Voice Client if in voice mode
  useEffect(() => {
    if (session.mode !== 'voice' || session.status !== 'active') return;

    const token = localStorage.getItem('auth_token') || '';
    const client = new VoiceClient({
      onSessionReady: () => {
        setIsVoiceConnected(true);
        setVoiceError(null);
      },
      onTranscriptPartial: (text) => {
        setVoicePartial(text);
      },
      onTranscriptFinal: (text) => {
        setVoicePartial('');
        setMessages((prev) => [
          ...prev,
          {
            seq: prev.length + 1,
            role: 'trainee',
            content: text,
            created_at: new Date().toISOString(),
          },
        ]);
      },
      onAssistantText: (text) => {
        setMessages((prev) => [
          ...prev,
          {
            seq: prev.length + 1,
            role: 'counterpart',
            content: text,
            created_at: new Date().toISOString(),
          },
        ]);
      },
      onAssistantSpeaking: (speaking) => {
        setIsAssistantSpeaking(speaking);
      },
      onTurnComplete: (latency) => {
        setVoiceLatencyMs(latency);
      },
      onError: (err) => {
        console.error('Voice client notice:', err);
        setVoiceError(err);
      },
      onSessionEnded: () => {
        setSession((prev) => ({ ...prev, status: 'completed' }));
      },
    });

    client
      .connect(session.id, token)
      .then(() => setVoiceClient(client))
      .catch((err) => {
        console.warn('Voice connection failed, enabling text mode fallback option', err);
        setVoiceError('Real-time voice channel unavailable. Please use Text Mode.');
      });

    return () => {
      client.disconnect();
    };
  }, [session.id, session.mode, session.status]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming || session.status !== 'active') return;

    const traineeText = inputText.trim();
    setInputText('');

    const nextSeq = messages.length + 1;
    const traineeMsg: SessionMessage = {
      seq: nextSeq,
      role: 'trainee',
      content: traineeText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, traineeMsg]);
    setIsStreaming(true);
    setStreamingReply('');

    let accumulatedReply = '';

    await api.sendSessionMessageStream(
      session.id,
      traineeText,
      (chunk) => {
        accumulatedReply += chunk;
        setStreamingReply((prev) => prev + chunk);
      },
      async () => {
        setIsStreaming(false);
        const counterpartMsg: SessionMessage = {
          seq: nextSeq + 1,
          role: 'counterpart',
          content: accumulatedReply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, counterpartMsg]);
        setStreamingReply('');

        try {
          const updated = await api.getSessionDetail(session.id);
          setSession(updated);
          if (updated.status !== 'active') {
            onSessionEnded(updated);
          }
        } catch (err) {
          console.error('Error refreshing session', err);
        }
      },
      (err) => {
        console.error('Streaming error', err);
        setIsStreaming(false);
      }
    );
  };

  const toggleMicCapture = async () => {
    if (!voiceClient) return;

    if (!isRecordingMic) {
      try {
        await voiceClient.startAudioCapture();
        setIsRecordingMic(true);
      } catch (err) {
        console.error('Mic capture failed', err);
      }
    } else {
      voiceClient.commitTurn();
      voiceClient.stopAudioCapture();
      setIsRecordingMic(false);
    }
  };

  const handleInterrupt = () => {
    if (voiceClient) {
      voiceClient.interrupt();
      setIsAssistantSpeaking(false);
    }
  };

  const handleEndSessionExplicit = async () => {
    setIsEnding(true);
    try {
      if (voiceClient) {
        voiceClient.endSession();
      }
      const concluded = await api.endSession(session.id);
      setSession(concluded);
      setShowEndConfirm(false);
      onSessionEnded(concluded);
    } catch (err) {
      console.error('Failed to end session', err);
    } finally {
      setIsEnding(false);
    }
  };

  const isSessionClosed = session.status !== 'active';
  const personaName = scenarioDetail?.persona?.name || 'Simulation Partner';
  const personaRole = scenarioDetail?.persona?.role || 'Prospect / Executive';
  const currentExchange = Math.floor(messages.length / 2) + 1;
  const maxExchanges = scenarioDetail?.turn_limit || 20;
  const progressPercent = Math.min(100, Math.round((currentExchange / maxExchanges) * 100));

  // Dynamic emotional state indicator
  const emotionalState =
    currentExchange <= 2
      ? { label: 'Pleasant & Guarded', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' }
      : currentExchange <= 4
      ? { label: 'Cautiously Listening', color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/30' }
      : { label: 'Evaluating Value & ROI', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0B0F19] text-slate-100 overflow-hidden">
      {/* ================================================================= */}
      {/* LEFT SIDEBAR: Character Persona & Scenario Briefing Cockpit       */}
      {/* ================================================================= */}
      <aside
        className={`${
          isSidebarOpen ? 'w-80 lg:w-96' : 'w-0'
        } transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-slate-900/60 flex flex-col overflow-hidden relative backdrop-blur-xl z-20`}
      >
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-heading">
              Scenario Briefing
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition lg:hidden"
            aria-label="Collapse briefing"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation in Sidebar */}
        <div className="flex border-b border-slate-800/80 px-3 pt-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('persona')}
            className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'persona'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Partner Profile
          </button>
          <button
            onClick={() => setActiveTab('brief')}
            className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'brief'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Mission & Goals
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition ${
              activeTab === 'rubric'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Skills Tested
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'persona' && (
            <div className="space-y-4">
              {/* Persona Avatar & Title */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 font-bold text-white shadow-lg shadow-indigo-600/30">
                    {personaName.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{personaName}</h3>
                    <p className="text-xs text-indigo-300 font-medium">{personaRole}</p>
                  </div>
                </div>

                {/* Emotional State Indicator */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1.5">
                    <Activity className="h-3 w-3 text-indigo-400" />
                    <span>Real-Time Emotional Baseline</span>
                  </div>
                  <div className={`inline-flex items-center space-x-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${emotionalState.bg} ${emotionalState.color}`}>
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    <span>{emotionalState.label}</span>
                  </div>
                </div>
              </div>

              {/* Communication Style */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                  <Info className="h-3 w-3 text-indigo-400" />
                  <span>Communication Profile</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {scenarioDetail?.persona?.communication_style ||
                    'Speaks pleasantly but provides brief, high-level answers. Avoids commitment unless prompted with relevant, high-impact business questions.'}
                </p>
              </div>

              {/* Pro-Tips for Success */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/15 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center space-x-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Tactical Coaching Clue</span>
                </div>
                <p className="text-xs text-indigo-200/90 leading-relaxed">
                  Avoid giving early discounts or launching into long software pitches. Uncover their daily operational bottlenecks first by asking open-ended questions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'brief' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center space-x-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Your Role & Situation</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {scenarioDetail?.brief ||
                    'You are holding an initial discovery meeting with a prospective customer. Establish relevance, listen actively, and secure a concrete next step.'}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center space-x-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Primary Mission Target</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Secure a calendar-confirmed follow-up meeting with team data or workflow deep-dive, without making premature pricing concessions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'rubric' && (
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Executive Competencies Evaluated
              </div>
              {scenarioDetail?.skills_assessed && scenarioDetail.skills_assessed.length > 0 ? (
                scenarioDetail.skills_assessed.map((sa, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white capitalize">
                      <span>{sa.skill.replace(/_/g, ' ')}</span>
                      <span className="text-indigo-400">{Math.round(sa.weight * 100)}% Weight</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.round(sa.weight * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  Active Listening, Discovery Questions, Rapport Adaptation, and Closing Next Steps.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN STAGE: Live Simulation Arena & Message Stream               */}
      {/* ================================================================= */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-3 backdrop-blur-xl sm:px-6 z-10">
          <div className="flex items-center space-x-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Expand Scenario Briefing"
                aria-label="Expand Scenario Briefing"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Compass className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-tight sm:text-base font-heading">
                  {session.scenario_title}
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      session.mode === 'voice' ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-300">
                    {session.mode === 'voice' ? 'Voice Mode' : 'Text Mode'}
                  </span>
                </span>
                <span>•</span>
                <span className="font-mono text-slate-300">
                  Exchange {currentExchange} of {maxExchanges}
                </span>
                {voiceLatencyMs !== null && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400 font-mono">Latency: {voiceLatencyMs}ms</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Timer, Briefing Toggle, End Session */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden sm:flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isSidebarOpen ? 'Hide Brief' : 'Show Brief'}</span>
            </button>

            <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 font-mono text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {!isSessionClosed && (
              <button
                id="end-simulation-btn"
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center space-x-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>End Session</span>
              </button>
            )}
          </div>
        </header>

        {/* Progress Bar of Conversation Depth */}
        <div className="h-1 w-full bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Completion Banner if closed */}
        {isSessionClosed && (
          <div className="flex items-center justify-between border-b border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-violet-950/60 px-6 py-3.5 z-10">
            <div className="flex items-center space-x-2 text-xs text-indigo-200">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold">
                Practice complete. Your conversation transcript is ready to review.
              </span>
            </div>
            <button
              id="view-evaluation-btn"
              onClick={() => onViewEvaluation(session.id)}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 transition"
            >
              <span>View Executive Coaching Evaluation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VOICE MODE: Pulsating Audio Orb & Real-Time Waveform               */}
        {/* ================================================================= */}
        {session.mode === 'voice' && !isSessionClosed && (
          <div className="border-b border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 via-slate-900/60 to-transparent p-6 flex flex-col items-center justify-center">
            <div className="flex items-center space-x-5">
              {/* Audio Wave Visualizer Orb */}
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 ${
                  isAssistantSpeaking
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 scale-110 shadow-2xl shadow-indigo-500/50'
                    : isRecordingMic
                    ? 'bg-rose-600 scale-110 shadow-2xl shadow-rose-500/50 animate-pulse'
                    : 'bg-slate-900 border border-slate-700 shadow-inner'
                }`}
              >
                {isAssistantSpeaking ? (
                  <div className="flex items-center space-x-1 text-white">
                    <span className="sound-bar [animation-delay:0.1s]" />
                    <span className="sound-bar [animation-delay:0.3s]" />
                    <span className="sound-bar [animation-delay:0.2s]" />
                    <span className="sound-bar [animation-delay:0.4s]" />
                  </div>
                ) : isRecordingMic ? (
                  <Radio className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Mic className="h-8 w-8 text-slate-400" />
                )}
              </div>

              <div>
                <div className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>
                    {isAssistantSpeaking
                      ? `${personaName} is speaking...`
                      : isRecordingMic
                      ? 'Listening to you... (Click Done when finished)'
                      : isVoiceConnected
                      ? 'Ready: Click Speak to start turn'
                      : voiceError
                      ? 'Voice Channel Offline'
                      : 'Connecting to Real-Time Voice Audio...'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Natural conversation with speech-to-speech cadence. You can interrupt anytime.
                </p>
              </div>
            </div>

            {/* Voice Action Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                id="voice-record-btn"
                onClick={toggleMicCapture}
                className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-lg ${
                  isRecordingMic
                    ? 'bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-500'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-600/25 hover:opacity-95'
                }`}
              >
                {isRecordingMic ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isRecordingMic ? 'Done Speaking (Send Turn)' : 'Speak Turn'}</span>
              </button>

              {isAssistantSpeaking && (
                <button
                  id="voice-interrupt-btn"
                  onClick={handleInterrupt}
                  className="flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
                >
                  <Hand className="h-4 w-4" />
                  <span>Interrupt & Speak</span>
                </button>
              )}

              <button
                id="fallback-to-text-btn"
                onClick={() => setSession((prev) => ({ ...prev, mode: 'text' }))}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Switch to Text Mode</span>
              </button>
            </div>

            {/* Live partial captions */}
            {voicePartial && (
              <div className="mt-3 text-xs text-indigo-300 font-serif italic max-w-lg text-center bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                "{voicePartial}"
              </div>
            )}
            {voiceError && (
              <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg">
                {voiceError}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TRANSCRIPT VIEW: Professional Message Stream                      */}
        {/* ================================================================= */}
        <div
          id="chat-messages-container"
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6"
        >
          {messages.map((m) => (
            <div
              key={m.seq}
              data-role={m.role}
              className={`flex items-start space-x-3 ${
                m.role === 'trainee' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold shadow-md ${
                  m.role === 'trainee'
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-600/25'
                    : 'bg-slate-900 text-indigo-300 border border-slate-700/80'
                }`}
              >
                {m.role === 'trainee' ? (
                  'You'
                ) : (
                  personaName.split(' ').map((n) => n[0]).join('')
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm leading-relaxed sm:max-w-[70%] shadow-lg ${
                  m.role === 'trainee'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-600/10'
                    : 'border border-slate-800/90 bg-slate-900/90 text-slate-100 rounded-tl-none shadow-black/20'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>{m.role === 'trainee' ? 'You (Trainee)' : `${personaName} · ${personaRole}`}</span>
                  <span className="text-[9px] text-slate-500 font-mono">Turn #{m.seq}</span>
                </div>
                <div className="whitespace-pre-line text-sm">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Live Streaming Bubble for Text mode */}
          {isStreaming && (
            <div className="flex items-start space-x-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-indigo-300 border border-slate-700">
                {personaName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="max-w-[85%] rounded-3xl rounded-tl-none border border-indigo-500/30 bg-slate-900/90 px-5 py-4 text-sm leading-relaxed text-slate-100 sm:max-w-[70%] shadow-lg shadow-indigo-500/5">
                <div className="text-[10px] font-bold text-indigo-400 mb-1.5 uppercase tracking-wider flex items-center space-x-2">
                  <span>{personaName} (Responding...)</span>
                </div>
                <div className="whitespace-pre-line">
                  {streamingReply || (
                    <span className="flex items-center space-x-1.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                    </span>
                  )}
                  <span className="inline-block h-4 w-1.5 bg-indigo-400 ml-1 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ================================================================= */}
        {/* INPUT STAGE: Text Input Area & Keyboard Handlers                   */}
        {/* ================================================================= */}
        {session.mode === 'text' && (
          <div className="border-t border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-xl sm:px-6">
            <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
              <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950/90 p-2.5 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-xl">
                <textarea
                  id="chat-message-input"
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isStreaming || isSessionClosed}
                  placeholder={
                    isSessionClosed
                      ? 'Simulation has concluded. Review your feedback report above.'
                      : `Speak with ${personaName}... (Press Enter to send, Shift+Enter for new line)`
                  }
                  className="w-full resize-none bg-transparent p-2 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                />

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 px-2">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                    <span>Press Enter to send</span>
                    <span>•</span>
                    <span>{inputText.length} chars</span>
                  </div>

                  <button
                    id="send-message-btn"
                    type="submit"
                    disabled={!inputText.trim() || isStreaming || isSessionClosed}
                    className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:opacity-95 transition disabled:opacity-30"
                  >
                    <span>Send Response</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* End Session Confirmation Modal */}
        {showEndConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="conclude-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setShowEndConfirm(false)}
              className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl z-10">
              <div className="flex items-center space-x-3 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
                <h3 id="conclude-dialog-title" className="text-lg font-bold text-white font-heading">Conclude Simulation?</h3>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Ending this conversation will lock the roleplay transcript and generate your comprehensive rubric scoring, moment analysis, and practice drills.
              </p>
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Keep Practicing
                </button>
                <button
                  id="confirm-end-session-btn"
                  onClick={handleEndSessionExplicit}
                  disabled={isEnding}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-600/25 disabled:opacity-50"
                >
                  {isEnding ? 'Concluding...' : 'Conclude and Evaluate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
