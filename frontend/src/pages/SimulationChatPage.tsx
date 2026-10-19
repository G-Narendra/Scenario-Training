import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { ScenarioDetail, SessionMessage, SimulationSession } from '../types';
import { VoiceClient } from '../voice/voiceClient';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Hand,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
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
  const [showRoleDrawer, setShowRoleDrawer] = useState(false);

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
  const [, setIsVoiceConnected] = useState(false);
  const [, setIsRecordingMic] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [voicePartial, setVoicePartial] = useState('');
  const [, setVoiceLatencyMs] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Scenario Specification (Persona, Brief)
  useEffect(() => {
    if (!session.scenario_id) return;
    api.getScenarioDetail(session.scenario_id)
      .then((detail) => setScenarioDetail(detail))
      .catch((err) => console.error('Failed to load scenario details', err));
  }, [session.scenario_id]);

  // Timer Effect
  useEffect(() => {
    if (session.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
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
      onMicStatusChange: (isCapturing, muted) => {
        setIsRecordingMic(isCapturing);
        setIsMicMuted(muted);
      },
      onTurnComplete: (latency) => {
        setVoiceLatencyMs(latency);
      },
      onError: (err) => {
        console.error('Voice notice:', err);
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

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingReply]);

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

  const toggleMicMute = () => {
    if (!voiceClient) return;
    const muted = voiceClient.toggleMute();
    setIsMicMuted(muted);
  };

  const handlePlayMessageAudio = (text: string) => {
    if (voiceClient) {
      voiceClient.speakText(text);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        text
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/#+\s/g, '')
          .replace(/`/g, '')
          .trim()
      );
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Online') ||
              v.name.includes('Guy') ||
              v.name.includes('Jenny') ||
              v.name.includes('Samantha'))
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      if (naturalVoice) utterance.voice = naturalVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleInterrupt = () => {
    if (voiceClient) {
      voiceClient.interrupt();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAssistantSpeaking(false);
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
      onViewEvaluation(concluded.id);
    } catch (err) {
      console.error('Failed to end session', err);
    } finally {
      setIsEnding(false);
    }
  };

  const isSessionClosed = session.status !== 'active';
  const personaName = scenarioDetail?.persona?.name || 'Counterpart';
  const personaRole = scenarioDetail?.persona?.role || 'Executive';
  const counterpartInitials = personaName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 dark:bg-[#0B192C] dark:text-slate-100 flex-col overflow-hidden transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-[#1E3E62] dark:bg-[#0B192C] z-10">
        <div className="flex items-center space-x-3">
          {/* Counterpart Avatar with CRISP WHITE text on dark navy background */}
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white font-bold text-sm border border-[#1E3E62] shadow-sm">
            {counterpartInitials}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {personaName}
              </h2>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-[#FF6500] uppercase tracking-wider">
                {personaRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 truncate max-w-xs sm:max-w-md">
              {session.scenario_title}
            </p>
          </div>
        </div>

        {/* Controls: Timer & End Practice Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs font-bold text-slate-700 shadow-sm dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-slate-200">
            <Clock className="h-3.5 w-3.5 text-[#FF6500]" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {!isSessionClosed && (
            <button
              id="end-practice-btn"
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>End Practice</span>
            </button>
          )}
        </div>
      </header>

      {/* Pinned Your Role & Mission Banner */}
      <div className="border-b border-amber-500/30 bg-amber-500/10 dark:bg-[#132B45] px-4 py-2 sm:px-6 flex items-center justify-between text-xs z-10 transition-colors">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-black text-[#FF6500] uppercase tracking-wider flex items-center space-x-1">
            <UserCheck className="h-3.5 w-3.5 inline mr-1" />
            <span>YOU (STUDENT):</span>
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {scenarioDetail?.track === 'sales' ? 'Enterprise Sales Representative' : 'Direct Manager / Team Leader'}
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-600 dark:text-slate-300">
            {scenarioDetail?.track === 'sales'
              ? `Negotiating with client ${personaName}`
              : `Leading meeting with direct report ${personaName} (${personaRole})`}
          </span>
        </div>
        <button
          onClick={() => setShowRoleDrawer(!showRoleDrawer)}
          className="ml-2 font-bold text-[#FF6500] hover:underline flex items-center space-x-1 flex-shrink-0"
        >
          <span>{showRoleDrawer ? 'Hide Brief' : 'Scenario Mission'}</span>
          {showRoleDrawer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showRoleDrawer && scenarioDetail && (
        <div className="border-b border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] px-6 py-3.5 text-xs z-10 space-y-2 shadow-md animate-in slide-in-from-top-1">
          <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-[#FF6500]">
            Meeting Context & Your Objective:
          </div>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {scenarioDetail.brief}
          </p>
          {scenarioDetail.tactical_coaching_clue && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-[#132B45] p-2.5 text-slate-800 dark:text-amber-200">
              💡 <span className="font-bold">Tactical Guidance:</span> {scenarioDetail.tactical_coaching_clue}
            </div>
          )}
        </div>
      )}

      {/* Completion Banner if closed */}
      {isSessionClosed && (
        <div className="flex items-center justify-between border-b border-[#FF6500]/40 bg-[#0B192C] px-6 py-3.5 z-10 text-white">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-[#FF6500]" />
            <span>Practice session complete. Review your performance evaluation report below.</span>
          </div>
          <button
            id="view-evaluation-btn"
            onClick={() => onViewEvaluation(session.id)}
            className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FF6500]/30 transition"
          >
            <span>View Evaluation</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hands-Free Live Voice Call Control Deck */}
      {session.mode === 'voice' && !isSessionClosed && (
        <div className="border-b border-slate-300 dark:border-[#1E3E62] bg-gradient-to-b from-slate-100 to-slate-200/80 dark:from-[#0B192C] dark:to-[#071322] p-5">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left: Call Status & Persona Info */}
            <div className="flex items-center space-x-4">
              <div
                className={`relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-300 shadow-lg ${
                  isAssistantSpeaking
                    ? 'bg-[#FF6500] text-white shadow-[#FF6500]/40 scale-105'
                    : isMicMuted
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-emerald-600 text-white shadow-emerald-500/30 animate-pulse'
                }`}
              >
                {isAssistantSpeaking ? (
                  <div className="flex items-center space-x-1">
                    <span className="sound-bar [animation-delay:0.1s]" />
                    <span className="sound-bar [animation-delay:0.3s]" />
                    <span className="sound-bar [animation-delay:0.2s]" />
                  </div>
                ) : isMicMuted ? (
                  <MicOff className="h-6 w-6 text-rose-300" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${isAssistantSpeaking ? 'bg-[#FF6500] animate-ping' : isMicMuted ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {isAssistantSpeaking
                      ? `${personaName} is speaking...`
                      : isMicMuted
                      ? 'Microphone Muted'
                      : 'Live Call Active • Hands-Free'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  {isAssistantSpeaking
                    ? 'Listen to the client response (barge in anytime by speaking)'
                    : isMicMuted
                    ? 'Click Unmute when you want to respond'
                    : 'Speak naturally — pauses auto-send without clicking buttons'}
                </div>
              </div>
            </div>

            {/* Right: Actions (Mute, Interrupt, Text Switch, Conclude) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="voice-mic-mute-btn"
                type="button"
                onClick={toggleMicMute}
                className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  isMicMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] text-slate-800 dark:text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-500" />}
                <span>{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>

              {isAssistantSpeaking && (
                <button
                  id="voice-interrupt-btn"
                  type="button"
                  onClick={handleInterrupt}
                  className="flex items-center space-x-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition"
                >
                  <Hand className="h-3.5 w-3.5" />
                  <span>Interrupt</span>
                </button>
              )}

              {messages.some((m) => m.role === 'counterpart') && !isAssistantSpeaking && (
                <button
                  id="voice-replay-btn"
                  type="button"
                  onClick={() => {
                    const last = [...messages].reverse().find((m) => m.role === 'counterpart');
                    if (last) handlePlayMessageAudio(last.content);
                  }}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition"
                  title="Re-play the counterpart's last spoken sentence"
                >
                  <Volume2 className="h-3.5 w-3.5 text-[#FF6500]" />
                  <span>Replay</span>
                </button>
              )}

              <button
                id="fallback-to-text-btn"
                type="button"
                onClick={() => {
                  if (voiceClient) voiceClient.stopSpeaking();
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setSession((prev) => ({ ...prev, mode: 'text' }));
                }}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Text Mode</span>
              </button>

              <button
                id="voice-end-call-btn"
                type="button"
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition"
              >
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* Live Speech Recognition Transcript Pill */}
          {voicePartial && (
            <div className="max-w-4xl mx-auto mt-3 flex items-center space-x-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-4 py-2 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">Hearing You:</span>
              <span className="italic">"{voicePartial}"</span>
            </div>
          )}

          {voiceError && (
            <div className="max-w-4xl mx-auto mt-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg">
              {voiceError}
            </div>
          )}
        </div>
      )}

      {/* Main Clean Chat Stream */}
      <div
        id="chat-messages-container"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 space-y-5 max-w-4xl mx-auto w-full"
      >
        {messages.map((m) => {
          const isUser = m.role === 'trainee';
          return (
            <div
              key={m.seq}
              data-role={m.role}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar with pure crisp white text */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm avatar-counterpart ${
                  isUser
                    ? 'bg-[#FF6500] text-white'
                    : 'bg-[#0B192C] text-white border border-[#1E3E62]'
                }`}
                style={{ color: '#ffffff' }}
              >
                <span className="text-white font-bold text-xs" style={{ color: '#ffffff' }}>
                  {isUser ? 'You' : counterpartInitials}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm ${
                  isUser
                    ? 'bg-[#FF6500] text-white rounded-tr-sm font-medium'
                    : 'border border-slate-300 bg-white text-slate-900 rounded-tl-sm dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-white font-medium'
                }`}
              >
                {/* Header inside bubble — counterpart only to prevent duplicate 'You' on user messages */}
                {!isUser && (
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <span>
                      {personaName} · {personaRole}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayMessageAudio(m.content)}
                      title="Listen out loud"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1E3E62] text-slate-500 hover:text-[#FF6500] dark:text-slate-400 dark:hover:text-[#FF6500] transition"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className={`whitespace-pre-line text-base leading-relaxed ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Bubble for Text mode */}
        {isStreaming && (
          <div className="flex items-start space-x-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white font-bold text-xs border border-[#1E3E62] shadow-sm avatar-counterpart"
              style={{ color: '#ffffff' }}
            >
              <span className="text-white font-bold text-xs" style={{ color: '#ffffff' }}>
                {counterpartInitials}
              </span>
            </div>
            <div className="max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tl-sm border border-slate-300 bg-white p-4 shadow-sm dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-white font-medium">
              <div className="text-[11px] font-bold text-[#FF6500] mb-1.5 uppercase tracking-wider">
                {personaName} · Responding...
              </div>
              <div className="whitespace-pre-line text-base leading-relaxed text-slate-900 dark:text-white">
                {streamingReply || (
                  <span className="flex items-center space-x-1.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-[#FF6500] animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-[#FF6500] animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-[#FF6500] animate-bounce [animation-delay:0.4s]" />
                  </span>
                )}
                <span className="inline-block h-4 w-1.5 bg-[#FF6500] ml-1 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {session.mode === 'text' && (
        <div className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md dark:border-[#1E3E62] dark:bg-[#0B192C]">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-slate-300 bg-slate-50 p-3 transition focus-within:border-[#FF6500] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF6500]/25 shadow-sm dark:border-[#1E3E62] dark:bg-[#132B45]">
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
                    ? 'Practice session has ended. Review your evaluation report above.'
                    : `Respond to ${personaName}... (Press Enter to send, Shift+Enter for new line)`
                }
                className="w-full resize-none bg-transparent p-1.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder-slate-400 font-medium"
              />

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#1E3E62] pt-2 px-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Press Enter to send
                </div>

                <button
                  id="send-message-btn"
                  type="submit"
                  disabled={!inputText.trim() || isStreaming || isSessionClosed}
                  className="flex items-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-sm font-bold text-white shadow-md shadow-[#FF6500]/25 transition disabled:opacity-40"
                >
                  <span>Send</span>
                  <Send className="h-4 w-4" />
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
            className="fixed inset-0 bg-[#0B192C]/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-2xl z-10">
            <div className="flex items-center space-x-3 text-[#FF6500]">
              <AlertTriangle className="h-6 w-6" />
              <h3 id="conclude-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                End Practice Session?
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Ending this conversation will finalize the dialogue transcript and generate your executive coaching evaluation debrief.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E3E62]"
              >
                Keep Practicing
              </button>
              <button
                id="confirm-end-session-btn"
                onClick={handleEndSessionExplicit}
                disabled={isEnding}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-rose-600/25 disabled:opacity-50"
              >
                {isEnding ? 'Concluding...' : 'Conclude & Evaluate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
