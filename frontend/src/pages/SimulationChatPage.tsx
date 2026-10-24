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
  Languages,
  Loader2,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
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
  const [, setIsVoiceConnected] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [voicePartial, setVoicePartial] = useState('');
  const [, setVoiceLatencyMs] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [selectedVoiceLang, setSelectedVoiceLang] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scenariolab_voice_lang');
      if (saved) return saved;
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language;
      if (nav) return nav;
    }
    return 'en-IN';
  });

  // Auto-Voice & Hands-free Dictation
  const [autoVoice, setAutoVoice] = useState(session.mode === 'voice');
  const [currentlySpeakingSeq, setCurrentlySpeakingSeq] = useState<number | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dictationRecRef = useRef<any>(null);

  // Resolve Persona Name early with robust scenario fallbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawScenario = (session as any).scenario;
  const personaName =
    scenarioDetail?.persona?.name ||
    rawScenario?.persona?.name ||
    (session.scenario_title?.toLowerCase().includes('marcus') || session.scenario_id?.toLowerCase().includes('marcus') ? 'Marcus Vance' : 'Marcus Vance');

  // Single unified VoiceClient instance across the entire page lifecycle
  const voiceClientRef = useRef<VoiceClient | null>(null);
  const handleVoiceTurnCommitRef = useRef<((text: string) => Promise<void>) | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  if (!voiceClientRef.current) {
    voiceClientRef.current = new VoiceClient({
      onSessionReady: (readyName) => {
        if (readyName) voiceClientRef.current?.setPersona(readyName);
        setIsVoiceConnected(true);
        setVoiceError(null);
      },
      onTranscriptPartial: (text) => {
        setVoicePartial(text);
      },
      onTranscriptFinal: (_text) => {
        setVoicePartial('');
      },
      onFallbackHttpSend: async (spokenText) => {
        if (handleVoiceTurnCommitRef.current) {
          await handleVoiceTurnCommitRef.current(spokenText);
        }
      },
      onAssistantText: (text) => {
        const nextSeq = messages.length + 1;
        setCurrentlySpeakingSeq(nextSeq);
        setMessages((prev) => [
          ...prev,
          {
            seq: nextSeq,
            role: 'counterpart',
            content: text,
            created_at: new Date().toISOString(),
          },
        ]);
        api.getSessionDetail(sessionRef.current.id)
          .then((updated) => {
            setSession(updated);
            if (updated.status !== 'active') onSessionEnded(updated);
          })
          .catch(() => {});
      },
      onAssistantSpeaking: (speaking) => {
        setIsAssistantSpeaking(speaking);
        if (!speaking) setCurrentlySpeakingSeq(null);
      },
      onMicStatusChange: (isCapturing, muted) => {
        setIsRecordingMic(isCapturing);
        setIsMicMuted(muted);
      },
      onTurnComplete: (latency) => {
        setVoiceLatencyMs(latency);
      },
      onError: (err) => {
        console.warn('Voice notice:', err);
        const lower = (err || '').toLowerCase();
        if (lower.includes('mic') || lower.includes('permission') || lower.includes('not-allowed')) {
          setVoiceError(err);
        } else {
          setVoiceError(null);
        }
      },
      onSessionEnded: () => {
        setSession((prev) => ({ ...prev, status: 'completed' }));
      },
    });
    voiceClientRef.current.setPersona(personaName);
  }

  const voiceClient = voiceClientRef.current;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Scenario Specification (Persona, Brief)
  useEffect(() => {
    if (!session.scenario_id) return;
    api.getScenarioDetail(session.scenario_id)
      .then((detail) => {
        setScenarioDetail(detail);
        if (detail.persona?.name) {
          voiceClient.setPersona(detail.persona.name);
        }
      })
      .catch((err) => console.error('Failed to load scenario details', err));
  }, [session.scenario_id, personaName]);

  // Timer Effect
  useEffect(() => {
    if (session.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.status]);

  // Mobile AudioContext unlock on any screen touch or click
  useEffect(() => {
    if (session.mode !== 'voice') return;
    const unlockAudio = () => {
      voiceClient.ensureAudioContext().catch(() => {});
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, [session.mode, voiceClient]);

  const hasSpokenOpeningRef = useRef(false);

  // Auto-speak scenario opening line after exactly 1.0 second upon entering voice practice
  useEffect(() => {
    if (session.mode !== 'voice' || session.status !== 'active') return;
    if (hasSpokenOpeningRef.current) return;

    const openingMsg = messages.find((m) => m.role === 'counterpart');
    if (!openingMsg || !openingMsg.content) return;

    hasSpokenOpeningRef.current = true;

    // Immediately prefetch neural audio into memory cache during the 1-second delay
    voiceClient.prefetchAudio(openingMsg.content, personaName).catch(() => {});

    const timer = setTimeout(async () => {
      if (session.status === 'active') {
        setCurrentlySpeakingSeq(openingMsg.seq);
        setIsAssistantSpeaking(true);
        try {
          await voiceClient.speakText(openingMsg.content, personaName);
        } catch (err) {
          console.warn('Auto-speak opening line notice:', err);
          voiceClient.releaseTurnLock();
          setIsAssistantSpeaking(false);
          setCurrentlySpeakingSeq(null);
        }
      }
    }, 1000); // EXACTLY 1 second delay after clicking Start Practice & mounting

    return () => clearTimeout(timer);
  }, [session.mode, session.status, messages, personaName, voiceClient]);

  // Unified Voice Turn Handler: streams reply via API and speaks with neural Edge-TTS
  const handleVoiceTurnCommit = async (spokenText: string) => {
    if (!spokenText.trim() || isStreaming || session.status !== 'active') return;

    const traineeText = spokenText.trim();
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
    let hasPrefetchedSentence = false;

    try {
      await api.sendSessionMessageStream(
        session.id,
        traineeText,
        (chunk) => {
          accumulatedReply += chunk;
          setStreamingReply((prev) => prev + chunk);

          // Early TTS pipeline: As soon as the first sentence ends, prefetch neural TTS in background!
          if (!hasPrefetchedSentence && accumulatedReply.length >= 25 && /[.?!]\s+$/.test(accumulatedReply)) {
            hasPrefetchedSentence = true;
            voiceClient.prefetchAudio(accumulatedReply.trim(), personaName).catch(() => {});
          }
        },
        async (_status, _endReason, latencyMs) => {
          setIsStreaming(false);
          const counterpartSeq = nextSeq + 1;
          const counterpartMsg: SessionMessage = {
            seq: counterpartSeq,
            role: 'counterpart',
            content: accumulatedReply,
            latency_ms: latencyMs,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, counterpartMsg]);
          setStreamingReply('');

          // Speak counterpart response aloud using neural human voice with instant audio playback
          if (accumulatedReply && accumulatedReply.trim()) {
            setCurrentlySpeakingSeq(counterpartSeq);
            setIsAssistantSpeaking(true);
            await voiceClient.speakText(accumulatedReply, personaName);
          } else {
            // Empty response safety: immediately unlock so conversation never stalls
            voiceClient.releaseTurnLock();
          }

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
          console.error('Voice stream error', err);
          setIsStreaming(false);
          setVoiceError('Connection interrupted. You can speak again now.');
          // Vital: Release turn lock on stream failure so call is never stuck paused!
          voiceClient.releaseTurnLock();
        }
      );
    } catch (unexpectedErr) {
      console.error('Unexpected voice turn error', unexpectedErr);
      setIsStreaming(false);
      voiceClient.releaseTurnLock();
    }
  };

  handleVoiceTurnCommitRef.current = handleVoiceTurnCommit;

  // Initialize Voice Client connection if in voice mode
  useEffect(() => {
    if (session.mode !== 'voice' || session.status !== 'active') return;

    const token = localStorage.getItem('auth_token') || '';
    voiceClient.setPersona(personaName);

    voiceClient
      .connect(session.id, token)
      .then(() => {
        setIsVoiceConnected(true);
      })
      .catch((err) => {
        console.warn('Voice connection notice, continuing in HTTP audio mode', err);
        setIsVoiceConnected(true);
      });

    return () => {
      voiceClient.disconnect();
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

    if (isDictating && dictationRecRef.current) {
      try { dictationRecRef.current.stop(); } catch {}
      dictationRecRef.current = null;
      setIsDictating(false);
    }

    let accumulatedReply = '';

    await api.sendSessionMessageStream(
      session.id,
      traineeText,
      (chunk) => {
        accumulatedReply += chunk;
        setStreamingReply((prev) => prev + chunk);
      },
      async (_status, _endReason, latencyMs) => {
        setIsStreaming(false);
        const counterpartMsg: SessionMessage = {
          seq: nextSeq + 1,
          role: 'counterpart',
          content: accumulatedReply,
          latency_ms: latencyMs,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, counterpartMsg]);
        setStreamingReply('');

        // Automatically speak counterpart reply aloud with natural voice
        if (autoVoice && accumulatedReply) {
          handlePlayMessageAudio(accumulatedReply, nextSeq + 1);
        }

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

  const handlePlayMessageAudio = (text: string, seq?: number) => {
    if (!text) return;
    if (seq !== undefined) {
      setCurrentlySpeakingSeq(seq);
    }
    setIsAssistantSpeaking(true);
    voiceClient.speakText(text, personaName);
  };

  const handleStopAudio = () => {
    voiceClient.stopSpeaking();
    setIsAssistantSpeaking(false);
    setCurrentlySpeakingSeq(null);
  };

  const toggleAutoVoice = () => {
    if (autoVoice) {
      handleStopAudio();
    }
    setAutoVoice(!autoVoice);
  };

  const toggleDictation = () => {
    if (isDictating) {
      if (dictationRecRef.current) {
        try { dictationRecRef.current.stop(); } catch {}
        dictationRecRef.current = null;
      }
      setIsDictating(false);
      return;
    }

    interface SpeechAlternativeItem {
      transcript: string;
    }
    interface SpeechResultItem {
      [index: number]: SpeechAlternativeItem;
    }
    interface DictationSpeechEvent {
      results: {
        length: number;
        [index: number]: SpeechResultItem;
      };
    }
    interface DictationRecognition {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: DictationSpeechEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    }
    type DictationConstructor = new () => DictationRecognition;

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: DictationConstructor;
      webkitSpeechRecognition?: DictationConstructor;
    };
    const SpeechRec = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRec) {
      alert('Speech-to-text is not supported by your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = selectedVoiceLang || 'en-IN';

      rec.onresult = (event: DictationSpeechEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setInputText(transcript.trim());
      };

      rec.onerror = () => {
        setIsDictating(false);
      };

      rec.onend = () => {
        setIsDictating(false);
      };

      rec.start();
      dictationRecRef.current = rec;
      setIsDictating(true);
    } catch (err) {
      console.warn('Speech recognition start error', err);
      setIsDictating(false);
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
  const personaRole = scenarioDetail?.persona?.role || 'Executive';
  const counterpartInitials = personaName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 dark:bg-[#0B192C] dark:text-slate-100 flex-col overflow-hidden transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-md sm:px-6 sm:py-3 dark:border-[#1E3E62] dark:bg-[#0B192C] z-10">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Counterpart Avatar with CRISP WHITE text on dark navy background */}
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white font-bold text-xs sm:text-sm border border-[#1E3E62] shadow-sm">
            {counterpartInitials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[90px] sm:max-w-none">
                {personaName}
              </h2>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[10px] sm:text-xs font-semibold text-[#FF6500] uppercase tracking-wider truncate max-w-[80px] sm:max-w-none">
                {personaRole}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-300 truncate max-w-[130px] sm:max-w-md">
              {session.scenario_title}
            </p>
          </div>
        </div>

        {/* Controls: Voice/Text Mode Switcher, Voice Toggle, Timer & End Practice Button */}
        <div className="flex items-center space-x-1 sm:space-x-2.5 flex-shrink-0">
          <button
            id="mode-switch-btn"
            type="button"
            onClick={() => {
              const nextMode = session.mode === 'voice' ? 'text' : 'voice';
              if (nextMode === 'voice') {
                setAutoVoice(true);
              } else if (voiceClient) {
                voiceClient.stopSpeaking();
              }
              setSession((prev) => ({ ...prev, mode: nextMode }));
            }}
            className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl border px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition shadow-sm ${
              session.mode === 'voice'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-slate-200'
            }`}
            title="Toggle between real-time voice call and text messaging"
          >
            {session.mode === 'voice' ? (
              <>
                <Mic className="h-3.5 w-3.5 text-emerald-500 animate-pulse flex-shrink-0" />
                <span className="hidden sm:inline">Voice Call Active</span>
                <span className="sm:hidden font-bold">Voice</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                <span className="hidden sm:inline">Switch to Voice</span>
                <span className="sm:hidden font-bold">Voice</span>
              </>
            )}
          </button>

          {session.mode === 'voice' && (
            <button
              type="button"
              onClick={toggleAutoVoice}
              title={autoVoice ? "Mute automatic counterpart voice" : "Turn ON automatic counterpart voice"}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-xl border px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition shadow-sm ${
                autoVoice
                  ? 'border-[#FF6500]/40 bg-[#FF6500]/15 text-[#FF6500] dark:bg-[#FF6500]/20'
                  : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-slate-400'
              }`}
            >
              {autoVoice ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#FF6500] animate-pulse flex-shrink-0" />
                  <span className="hidden sm:inline">Voice: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Voice: OFF</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-slate-50 px-2 sm:px-3 py-1 font-mono text-[11px] sm:text-xs font-bold text-slate-700 shadow-sm dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-slate-200">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#FF6500] flex-shrink-0" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {!isSessionClosed && (
            <button
              id="end-practice-btn"
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center space-x-1 sm:space-x-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition"
            >
              <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">End Practice</span>
              <span className="sm:hidden font-bold">End</span>
            </button>
          )}
        </div>
      </header>

      {/* Pinned Role & Brief Header */}
      <div className="border-b border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#132B45] px-3 py-2 sm:px-6 flex items-center justify-between text-xs z-10 transition-colors">
        <div className="flex items-center space-x-2 truncate">
          <span className="font-bold text-[#FF6500] flex items-center space-x-1 flex-shrink-0">
            <UserCheck className="h-3.5 w-3.5 inline mr-1" />
            <span>Role:</span>
          </span>
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {scenarioDetail?.track === 'sales' ? 'Account Executive' : 'Team Lead'}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 dark:text-slate-300 truncate">
            Meeting with {personaName} ({personaRole})
          </span>
        </div>
        <button
          onClick={() => setShowRoleDrawer(!showRoleDrawer)}
          className="ml-2 font-semibold text-[#FF6500] hover:underline flex items-center space-x-1 flex-shrink-0 text-xs"
        >
          <span>{showRoleDrawer ? 'Hide Brief' : 'View Brief'}</span>
          {showRoleDrawer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showRoleDrawer && scenarioDetail && (
        <div className="border-b border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] px-4 py-3 sm:px-6 sm:py-3.5 text-xs z-10 space-y-2 shadow-md animate-in slide-in-from-top-1">
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
        <div className="flex items-center justify-between border-b border-[#FF6500]/40 bg-[#0B192C] px-4 py-3 sm:px-6 sm:py-3.5 z-10 text-white flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-[#FF6500] flex-shrink-0" />
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
        <div className="border-b border-slate-300 dark:border-[#1E3E62] bg-gradient-to-b from-slate-100 to-slate-200/80 dark:from-[#0B192C] dark:to-[#071322] p-3 sm:p-5">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Left: Call Status & Persona Info */}
            <div className="flex items-center space-x-3 sm:space-x-4 w-full md:w-auto">
              <div
                className={`relative flex h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md ${
                  isStreaming
                    ? 'bg-amber-500 text-white shadow-amber-500/40 animate-pulse'
                    : isAssistantSpeaking
                    ? 'bg-[#FF6500] text-white shadow-[#FF6500]/40 scale-105'
                    : isMicMuted
                    ? 'bg-slate-700 text-slate-300'
                    : isRecordingMic
                    ? 'bg-emerald-600 text-white shadow-emerald-500/30 animate-pulse'
                    : 'bg-slate-600 text-slate-200'
                }`}
              >
                {isStreaming ? (
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
                ) : isAssistantSpeaking ? (
                  <div className="flex items-center space-x-1">
                    <span className="sound-bar [animation-delay:0.1s]" />
                    <span className="sound-bar [animation-delay:0.3s]" />
                    <span className="sound-bar [animation-delay:0.2s]" />
                  </div>
                ) : isMicMuted ? (
                  <MicOff className="h-5 w-5 sm:h-6 sm:w-6 text-rose-300" />
                ) : (
                  <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span
                    className={`inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0 ${
                      isStreaming
                        ? 'bg-amber-400 animate-ping'
                        : isAssistantSpeaking
                        ? 'bg-[#FF6500] animate-ping'
                        : isMicMuted
                        ? 'bg-slate-400'
                        : isRecordingMic
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                    {isStreaming
                      ? `${personaName} is thinking...`
                      : isAssistantSpeaking
                      ? `${personaName} is speaking...`
                      : isMicMuted
                      ? 'Microphone Muted'
                      : isRecordingMic
                      ? 'Listening to you • Hands-Free'
                      : 'Microphone Ready'}
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium truncate sm:whitespace-normal">
                  {isStreaming
                    ? 'Generating counterpart response • Please wait...'
                    : isAssistantSpeaking
                    ? 'Listening to counterpart...'
                    : isMicMuted
                    ? 'Click Unmute to speak'
                    : isRecordingMic
                    ? 'Speak naturally (auto-sends when you pause)'
                    : 'Tap "Tap to Speak" or click Unmute'}
                </div>
              </div>
            </div>

            {/* Right: Actions (Mute, Interrupt, Done Speaking, Text Switch, Conclude) */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
              {/* Dialect / Language Selector to eradicate mistranscription */}
              <div className="col-span-3 sm:col-span-auto flex items-center space-x-1 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-2 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm flex-shrink-0">
                <Languages className="h-3.5 w-3.5 text-[#FF6500] flex-shrink-0" />
                <select
                  id="voice-language-select"
                  value={selectedVoiceLang}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedVoiceLang(newLang);
                    voiceClient?.setRecognitionLanguage(newLang);
                  }}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-[11px] sm:text-xs pr-0.5 w-full sm:w-auto"
                  title="Select accent/dialect for highest speech recognition accuracy"
                >
                  <option value="en-IN" className="dark:bg-[#0B192C]">English (India) 🇮🇳</option>
                  <option value="en-US" className="dark:bg-[#0B192C]">English (US) 🇺🇸</option>
                  <option value="en-GB" className="dark:bg-[#0B192C]">English (UK) 🇬🇧</option>
                  <option value="en-AU" className="dark:bg-[#0B192C]">English (AU) 🇦🇺</option>
                </select>
              </div>

              {/* Streaming state: Cancel & speak again */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsStreaming(false);
                    setStreamingReply('');
                    voiceClient?.releaseTurnLock();
                  }}
                  className="col-span-3 sm:col-span-1 flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition shadow-sm"
                  title="Cancel response generation and speak again"
                >
                  <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Cancel & Speak</span>
                </button>
              ) : voicePartial ? (
                <button
                  id="voice-send-now-btn"
                  type="button"
                  onClick={() => voiceClient?.forceCommitTurn()}
                  className="col-span-3 sm:col-span-1 flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition animate-pulse"
                >
                  <Send className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Done Speaking • Send Now</span>
                  <span className="sm:hidden">Send Spoken Words Now</span>
                </button>
              ) : !isRecordingMic && !isAssistantSpeaking && !isMicMuted ? (
                <button
                  id="voice-start-speaking-btn"
                  type="button"
                  onClick={() => {
                    voiceClient?.startAudioCapture(true);
                  }}
                  className="col-span-3 sm:col-span-1 flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition"
                >
                  <Mic className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Tap to Speak</span>
                </button>
              ) : null}

              <button
                id="voice-mic-mute-btn"
                type="button"
                onClick={toggleMicMute}
                className={`flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold transition shadow-sm ${
                  isMicMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] text-slate-800 dark:text-white'
                }`}
              >
                {isMicMuted ? <MicOff className="h-3.5 w-3.5 flex-shrink-0" /> : <Mic className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                <span className="hidden sm:inline">{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                <span className="sm:hidden">{isMicMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {isAssistantSpeaking && (
                <button
                  id="voice-interrupt-btn"
                  type="button"
                  onClick={handleInterrupt}
                  className="flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition"
                >
                  <Hand className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Interrupt</span>
                </button>
              )}

              {messages.some((m) => m.role === 'counterpart') && !isAssistantSpeaking && !isStreaming && (
                <button
                  id="voice-replay-btn"
                  type="button"
                  onClick={() => {
                    const last = [...messages].reverse().find((m) => m.role === 'counterpart');
                    if (last) handlePlayMessageAudio(last.content);
                  }}
                  className="flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition"
                  title="Re-play the counterpart's last spoken sentence"
                >
                  <Volume2 className="h-3.5 w-3.5 text-[#FF6500] flex-shrink-0" />
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
                className="flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition"
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Text Mode</span>
                <span className="sm:hidden">Text</span>
              </button>

              <button
                id="voice-end-call-btn"
                type="button"
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-rose-600/20 transition"
              >
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* Live Speech Recognition Transcript Pill with Quick Send */}
          {voicePartial && (
            <div className="max-w-4xl mx-auto mt-2.5 flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 px-3 sm:px-4 py-2 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-300 flex-shrink-0">Hearing You:</span>
                <span className="italic font-medium text-slate-800 dark:text-white truncate">"{voicePartial}"</span>
              </div>
              <button
                type="button"
                onClick={() => voiceClient?.forceCommitTurn()}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm transition flex-shrink-0 text-[11px] sm:text-xs"
              >
                <span>Send</span>
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}

          {voiceError && (
            <div className="max-w-4xl mx-auto mt-2.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg">
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
        {(() => {
          const lastUserSeq = [...messages].reverse().find(m => m.role === 'trainee')?.seq;
          return messages.map((m) => {
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
                      <span className="flex items-center space-x-2">
                        <span>
                          {personaName} · {personaRole}
                        </span>
                        {currentlySpeakingSeq === m.seq && (
                          <span className="flex items-center space-x-1 text-[#FF6500] font-bold normal-case text-[10px] bg-[#FF6500]/10 px-2 py-0.5 rounded-full border border-[#FF6500]/25 animate-pulse">
                            <Volume2 className="h-3 w-3 animate-bounce" />
                            <span>Talking...</span>
                          </span>
                        )}
                      </span>
                      {session.mode === 'voice' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentlySpeakingSeq === m.seq) {
                              handleStopAudio();
                            } else {
                              handlePlayMessageAudio(m.content, m.seq);
                            }
                          }}
                          title={currentlySpeakingSeq === m.seq ? 'Stop speaking' : 'Listen out loud'}
                          className={`p-1 rounded transition ${
                            currentlySpeakingSeq === m.seq
                              ? 'bg-[#FF6500] text-white shadow-sm'
                              : 'hover:bg-slate-200 dark:hover:bg-[#1E3E62] text-slate-500 hover:text-[#FF6500] dark:text-slate-400 dark:hover:text-[#FF6500]'
                          }`}
                        >
                          {currentlySpeakingSeq === m.seq ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                  <div className={`whitespace-pre-line text-base leading-relaxed ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {m.content}
                  </div>

                  {/* Quick Edit/Clarify action on user's latest turn if session is active */}
                  {isUser && !isSessionClosed && m.seq === lastUserSeq && (
                    <div className="mt-2 pt-1.5 border-t border-white/20 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText(m.content);
                          const el = document.getElementById('chat-message-input');
                          if (el) el.focus();
                        }}
                        className="text-[11px] text-white/90 hover:text-white underline decoration-white/40 hover:decoration-white transition font-medium flex items-center space-x-1"
                        title="Draft an edit or clarification in the message input"
                      >
                        <RotateCcw className="h-3 w-3 inline mr-1" />
                        <span>Edit / Clarify</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}

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
                disabled={isSessionClosed}
                placeholder={
                  isSessionClosed
                    ? 'Practice session has ended. Review your evaluation report above.'
                    : `Respond to ${personaName}... (Press Enter to send, Shift+Enter for new line)`
                }
                className="w-full resize-none bg-transparent p-1.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder-slate-400 font-medium"
              />

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#1E3E62] pt-2 px-1">
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Press Enter to send</span>
                  {isDictating && (
                    <span className="flex items-center space-x-1 text-rose-500 font-bold animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Recording voice...</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleDictation}
                    disabled={isStreaming || isSessionClosed}
                    title={isDictating ? 'Stop microphone recording' : 'Speak into microphone'}
                    className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition border shadow-sm ${
                      isDictating
                        ? 'bg-rose-600 text-white border-rose-700 animate-pulse ring-2 ring-rose-400/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#0B192C] dark:hover:bg-[#1E3E62] dark:text-slate-300 border-slate-300 dark:border-[#1E3E62]'
                    }`}
                  >
                    <Mic className={`h-3.5 w-3.5 ${isDictating ? 'text-white animate-bounce' : 'text-[#FF6500]'}`} />
                    <span>{isDictating ? 'Listening...' : 'Speak'}</span>
                  </button>

                  <button
                    id="send-message-btn"
                    type="submit"
                    disabled={!inputText.trim() || isStreaming || isSessionClosed}
                    className="flex items-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-sm font-bold text-white shadow-md shadow-[#FF6500]/25 transition disabled:opacity-40"
                  >
                    {isStreaming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Responding...</span>
                      </>
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
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
