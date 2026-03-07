'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import { RoomContext, RoomAudioRenderer } from '@livekit/components-react';
import { Room, RoomEvent } from 'livekit-client';

type ConState = 'idle' | 'connecting' | 'connected' | 'error';

function VoiceWaveform({ isActive, isSpeaking }: { isActive: boolean; isSpeaking: boolean }) {
  const color = isSpeaking ? '#22c55e' : '#a78bfa';
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 20 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: 3, backgroundColor: color }}
          animate={
            isActive
              ? { height: [6, 16 - (i % 3) * 3, 6], opacity: [0.7, 1, 0.7] }
              : { height: 4, opacity: 0.4 }
          }
          transition={
            isActive
              ? { duration: 0.5 + i * 0.07, repeat: Infinity, repeatType: 'reverse', delay: i * 0.09, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export function ARIAIsland() {
  const [open,          setOpen]          = useState(false);
  const [isMuted,       setIsMuted]       = useState(false);
  const [state,         setState]         = useState<ConState>('idle');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [transcript,    setTranscript]    = useState<string[]>([]);
  const [ariaSpeaking,  setAriaSpeaking]  = useState(false);
  const [userSpeaking,  setUserSpeaking]  = useState(false);
  const [room] = useState(() => new Room());

  const isConnected  = state === 'connected';
  const isConnecting = state === 'connecting';

  const statusLabel = isConnecting  ? 'Connecting…'
    : state === 'error'              ? (errorMsg || 'Error')
    : ariaSpeaking                   ? 'Speaking…'
    : userSpeaking                   ? 'Listening…'
    : isConnected                    ? 'Ready'
    : 'ARIA';

  // ── Connect to LiveKit ──────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;
    setState('connecting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/aria/connection-details', {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to connect');
      }
      const { serverUrl, participantToken } = await res.json();

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setUserSpeaking(speakers.some(s => s.isLocal));
        setAriaSpeaking(speakers.some(s => !s.isLocal));
      });
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === 'TRANSCRIPT' && msg.text)
            setTranscript(p => [...p, msg.text as string]);
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
  }, [state, room]);

  // ── Pill click: first click starts + expands, subsequent clicks toggle panel ─
  const handlePillClick = useCallback(async () => {
    if (!isConnected && !isConnecting) {
      setOpen(true);
      await connect();
    } else {
      setOpen(o => !o);
    }
  }, [isConnected, isConnecting, connect]);

  const toggleMute = useCallback(async () => {
    const nowEnabled = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(nowEnabled);
    setIsMuted(!nowEnabled);
  }, [isMuted, room]);

  const handleEnd = useCallback(() => {
    room.disconnect();
    setState('idle');
    setOpen(false);
    setIsMuted(false);
    setAriaSpeaking(false);
    setUserSpeaking(false);
    setTranscript([]);
  }, [room]);

  useEffect(() => () => { room.disconnect(); }, [room]);

  return (
    // Fixed overlay — top center, above all windows
    <div
      className="fixed top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      {/* ── Persistent jelly pill ──────────────────────────────────────────── */}
      <motion.button
        onClick={handlePillClick}
        className="pointer-events-auto relative flex items-center gap-3 px-4 py-2.5 select-none focus:outline-none"
        whileTap={{ scale: 0.94 }}
        title="Open ARIA voice assistant"
        style={{ filter: 'drop-shadow(0 8px 32px rgba(109,40,217,0.60))' }}
      >
        {/* Jelly morphing blob — matches VORA style */}
        <motion.div
          className="absolute inset-0 rounded-[999px]"
          style={{
            background: state === 'error'
              ? 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)'
              : ariaSpeaking
                ? 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #5b21b6 100%)',
            border: '1px solid rgba(167,139,250,0.35)',
          }}
          animate={{
            borderRadius: [
              '55% 45% 40% 60% / 60% 40% 55% 45%',
              '40% 60% 55% 45% / 45% 55% 40% 60%',
              '60% 40% 45% 55% / 55% 45% 60% 40%',
              '45% 55% 60% 40% / 40% 60% 45% 55%',
              '55% 45% 40% 60% / 60% 40% 55% 45%',
            ],
            scale: [1, 1.04, 0.97, 1.02, 1],
          }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 rounded-[999px] opacity-30"
          style={{ background: 'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.45) 0%, transparent 65%)' }}
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Logo */}
        <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white/10 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/os-assets/ai/aria.png" alt="ARIA" className="w-6 h-6 object-contain" draggable={false} />
        </div>
        {/* Content */}
        <div className="relative z-10 flex items-center gap-2.5">
          {isConnecting ? (
            <motion.div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : isConnected ? (
            <VoiceWaveform isActive={ariaSpeaking || userSpeaking} isSpeaking={ariaSpeaking} />
          ) : null}
          <span className="text-sm font-bold text-white tracking-widest uppercase" style={{ letterSpacing: '0.12em' }}>
            {isConnecting ? 'ARIA…' : isConnected ? statusLabel : 'ARIA'}
          </span>
          {isConnected && (
            <span className={`w-2 h-2 rounded-full ${ariaSpeaking ? 'bg-green-400 animate-pulse' : 'bg-violet-300 animate-pulse'}`} />
          )}
        </div>
      </motion.button>

      {/* ── Expanded panel — drops down from top center ────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto mt-1 w-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-800 via-purple-700 to-violet-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/15 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/os-assets/ai/aria.png" alt="ARIA" className="w-7 h-7 object-contain" draggable={false} />
                </div>
                <div>
                  <span className="text-white font-bold text-sm tracking-wider">ARIA</span>
                  <p className="text-white/60 text-[10px] leading-none mt-0.5">BEC Vortex Voice Assistant</p>
                </div>
              </div>
              <button
                onClick={handleEnd}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Waveform */}
            <div className="flex flex-col items-center gap-1 py-4">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 9 }).map((_, i) => {
                  const active = ariaSpeaking || userSpeaking;
                  const col = ariaSpeaking ? '#22c55e' : '#a78bfa';
                  return (
                    <motion.div
                      key={i}
                      className="rounded-full"
                      style={{ width: 4, backgroundColor: col }}
                      animate={
                        active
                          ? { height: [8, 20 + Math.sin(i * 1.2) * 10, 8], opacity: [0.6, 1, 0.6] }
                          : { height: 6, opacity: 0.3 }
                      }
                      transition={
                        active
                          ? { duration: 0.5 + i * 0.05, repeat: Infinity, repeatType: 'reverse', delay: i * 0.06, ease: 'easeInOut' }
                          : { duration: 0.4 }
                      }
                    />
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">{statusLabel}</p>
            </div>

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="px-3 pb-2 max-h-24 overflow-y-auto space-y-1">
                {transcript.slice(-3).map((t, i) => (
                  <p key={i} className="text-xs text-gray-400 bg-white/5 rounded px-2 py-1 leading-relaxed">
                    {t}
                  </p>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/10">
              {isConnected ? (
                <>
                  <button
                    onClick={toggleMute}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isMuted
                        ? 'bg-red-900/60 text-red-300 hover:bg-red-800/60'
                        : 'bg-violet-900/60 text-violet-300 hover:bg-violet-800/60'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={handleEnd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-900/60 text-red-300 hover:bg-red-800/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> End
                  </button>
                </>
              ) : state === 'error' ? (
                <button
                  onClick={connect}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-violet-700 text-white hover:bg-violet-600 transition-colors"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LiveKit audio renderer — invisible, required for playback */}
      {isConnected && (
        <RoomContext.Provider value={room}>
          <RoomAudioRenderer />
        </RoomContext.Provider>
      )}
    </div>
  );
}
