import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { SessionMessage, SimulationSession } from '../types';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Compass,
  LogOut,
  Send,
  Sparkles,
  User,
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
  const [messages, setMessages] = useState<SessionMessage[]>(initialSession.messages || []);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingReply]);

  // Session elapsed timer
  useEffect(() => {
    if (session.status !== 'active') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [session.status]);

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

    // Append trainee message optimistically
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

        // Refresh session to capture status update (e.g. natural conclusion)
        try {
          const updatedSession = await api.getSessionDetail(session.id);
          setSession(updatedSession);
          if (updatedSession.status !== 'active') {
            onSessionEnded(updatedSession);
          }
        } catch (err) {
          console.error('Failed to refresh session status', err);
        }
      },
      (err) => {
        setIsStreaming(false);
        console.error('Streaming error', err);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndSessionExplicit = async () => {
    setIsEnding(true);
    try {
      const ended = await api.endSession(session.id);
      setSession(ended);
      setShowEndConfirm(false);
      onSessionEnded(ended);
    } catch (err) {
      console.error('Failed to end session', err);
    } finally {
      setIsEnding(false);
    }
  };

  const isSessionClosed = session.status !== 'active';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-950">
      {/* Simulation Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight sm:text-base">
              {session.scenario_title}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="capitalize">{session.mode} Mode</span>
              </span>
              <span>•</span>
              <span>Turn {session.turn_count || Math.floor(messages.length / 2)}</span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-4">
          {/* Timer */}
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 font-mono text-xs text-slate-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* End Simulation Button */}
          {!isSessionClosed && (
            <button
              id="end-simulation-btn"
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>End Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Completion Banner if closed */}
      {isSessionClosed && (
        <div className="flex items-center justify-between border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/50 to-indigo-950/50 px-6 py-3">
          <div className="flex items-center space-x-2 text-xs text-cyan-300">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>
              Simulation Concluded ({session.end_reason || session.status}). Roleplay transcript is locked.
            </span>
          </div>
          <button
            id="view-evaluation-btn"
            onClick={() => onViewEvaluation(session.id)}
            className="flex items-center space-x-1.5 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400 transition"
          >
            <span>View Evaluation Report</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Message Transcript View */}
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
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${
                m.role === 'trainee'
                  ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {m.role === 'trainee' ? 'You' : <User className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed sm:max-w-[70%] ${
                m.role === 'trainee'
                  ? 'bg-cyan-600/90 text-white shadow-md shadow-cyan-600/10'
                  : 'border border-slate-800/80 bg-slate-900/90 text-slate-200'
              }`}
            >
              <div className="text-[10px] font-semibold text-slate-400/80 mb-1 uppercase tracking-wider">
                {m.role === 'trainee' ? 'You' : 'Counterpart'}
              </div>
              <div className="whitespace-pre-line">{m.content}</div>
            </div>
          </div>
        ))}

        {/* Live Streaming Bubble */}
        {isStreaming && (
          <div className="flex items-start space-x-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <User className="h-4 w-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl border border-cyan-500/30 bg-slate-900/90 px-5 py-3.5 text-sm leading-relaxed text-slate-200 sm:max-w-[70%] shadow-lg shadow-cyan-500/5">
              <div className="text-[10px] font-semibold text-cyan-400/80 mb-1 uppercase tracking-wider">
                Counterpart (Speaking)
              </div>
              <div className="whitespace-pre-line">
                {streamingReply || (
                  <span className="flex items-center space-x-1 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                  </span>
                )}
                <span className="inline-block h-4 w-1.5 bg-cyan-400 ml-1 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md sm:px-6">
        <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-2 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20">
            <textarea
              id="chat-message-input"
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming || isSessionClosed}
              placeholder={
                isSessionClosed
                  ? 'Simulation has concluded.'
                  : 'Type your response to the counterpart... (Press Enter to send, Shift+Enter for newline)'
              }
              className="w-full resize-none bg-transparent p-2 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between border-t border-slate-900 pt-2 px-2">
              <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                <span>Enter to Send</span>
                <span>•</span>
                <span>{inputText.length} chars</span>
              </div>

              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() || isStreaming || isSessionClosed}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:opacity-95 transition disabled:opacity-30"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowEndConfirm(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Conclude Simulation?</h3>
            </div>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              Are you sure you want to end this conversation early? The evaluator will generate feedback based on the dialogue turns completed so far.
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
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
              >
                {isEnding ? 'Concluding...' : 'Conclude and Evaluate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
