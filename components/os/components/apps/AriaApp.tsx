"use client";
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Loader2 } from 'lucide-react';
import { RoomContext, RoomAudioRenderer } from '@livekit/components-react';
import { Room, RoomEvent } from 'livekit-client';

type ConState = 'idle' | 'connecting' | 'connected' | 'error';

// ── Animated waveform bars (same as BEC BillDesk VoiceWaveform) ──
function VoiceWaveform({ isActive, isSpeaking, size = 'md' }: {
  isActive: boolean; isSpeaking: boolean; size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = { sm: { h: 16, bw: 3, gap: 2 }, md: { h: 24, bw: 4, gap: 3 }, lg: { h: 32, bw: 5, gap: 4 } }[size];
  const color = isSpeaking ? '#22c55e' : '#8b5cf6';
  return (
    <div className="flex items-center justify-center" style={{ gap: cfg.gap, height: cfg.h }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: cfg.bw, backgroundColor: color }}
          animate={
            isActive
              ? { height: [cfg.h * 0.3, cfg.h * (0.5 + (i % 3) * 0.17), cfg.h * 0.3], opacity: [0.7, 1, 0.7] }
              : { height: cfg.h * 0.2, opacity: 0.3 }
          }
          transition={
            isActive
              ? { duration: 0.45 + i * 0.07, repeat: Infinity, repeatType: 'reverse', delay: i * 0.1, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export function AriaApp() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted]       = useState(false);
  const [state, setState]           = useState<ConState>('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [ariaSpeaking, setAriaSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [room] = useState(() => new Room());

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  const isConnected  = state === 'connected';
  const isConnecting = state === 'connecting';

  const getStatusText = () => {
    if (isConnecting)      return 'Connecting...';
    if (state === 'error') return errorMsg || 'Connection error';
    if (ariaSpeaking)      return 'ARIA is speaking...';
    if (userSpeaking)      return 'Listening...';
    if (isConnected)       return 'Tap to speak';
    return 'Start voice assistant';
  };

  const connect = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;
    setState('connecting');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/aria/connection-details`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to get connection details');
      }
      const { serverUrl, participantToken } = await res.json();

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setUserSpeaking(speakers.some(s => s.isLocal));
        setAriaSpeaking(speakers.some(s => !s.isLocal));
      });
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === 'TRANSCRIPT' && msg.text) setTranscript(p => [...p, msg.text as string]);
        } catch { /* ignore */ }
      });
      room.on(RoomEvent.Disconnected, () => {
        setState('idle'); setAriaSpeaking(false); setUserSpeaking(false);
      });

      await room.connect(serverUrl, participantToken, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      setState('connected');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      setState('error');
    }
  }, [state, API_BASE, room]);

  const handleMicClick = useCallback(async () => {
    if (!isConnected) {
      await connect();
      setIsExpanded(true);
    } else {
      const nowEnabled = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(nowEnabled);
      setIsMuted(!nowEnabled);
    }
  }, [isConnected, isMuted, connect, room]);

  const handleClose = useCallback(() => {
    room.disconnect();
    setState('idle');
    setIsExpanded(false);
    setIsMuted(false);
    setAriaSpeaking(false);
    setUserSpeaking(false);
    setTranscript([]);
  }, [room]);

  useEffect(() => () => { room.disconnect(); }, [room]);

  return (
    <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-gray-950 to-indigo-950/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.button
          onClick={handleMicClick}
          className={`flex items-center justify-center rounded-full shadow-2xl transition-colors focus:outline-none ${
            isConnected
              ? ariaSpeaking
                ? 'bg-green-500 hover:bg-green-600'
                : userSpeaking
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
          }`}
          style={{ width: 72, height: 72 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.93 }}
          animate={
            isConnected && (ariaSpeaking || userSpeaking)
              ? { boxShadow: ['0 0 0 0 rgba(139,92,246,0.5)', '0 0 0 20px rgba(139,92,246,0)'] }
              : {}
          }
          transition={
            isConnected && (ariaSpeaking || userSpeaking)
              ? { duration: 1.4, repeat: Infinity }
              : {}
          }
        >
          {isConnecting ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isConnected ? (
            <VoiceWaveform isActive={ariaSpeaking || userSpeaking} isSpeaking={ariaSpeaking} size="md" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>

        <p className="text-sm text-gray-400">{getStatusText()}</p>
      </div>

      <AnimatePresence>
        {isExpanded && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">ARIA</h3>
                  <p className="text-white/70 text-xs">BEC Vortex Voice Assistant</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center justify-center mb-3">
                <VoiceWaveform isActive={ariaSpeaking || userSpeaking} isSpeaking={ariaSpeaking} size="lg" />
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-300">{getStatusText()}</p>
            </div>

            {transcript.length > 0 && (
              <div className="px-4 pb-3 max-h-28 overflow-y-auto space-y-1">
                {transcript.slice(-4).map((t, i) => (
                  <p key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded px-2 py-1">
                    {t}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={handleMicClick}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isConnected && (
        <RoomContext.Provider value={room}>
          <RoomAudioRenderer />
        </RoomContext.Provider>
      )}
    </div>
  );
}