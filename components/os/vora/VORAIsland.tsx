'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import VORAMessage                 from './VORAMessage';
import VORAStatusDot               from './VORAStatusDot';
import { useVORA }                 from './useVORA';
import type { VoraProvider }       from './useVORA';
import type { VoraOsCommand }      from '@/lib/agent/types';

const OPENROUTER_MODELS = [
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free',      label: 'Nemotron 30B'    },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',   label: 'Llama 3.3 70B'  },
  { id: 'arcee-ai/trinity-mini:free',               label: 'Trinity Mini'   },
  { id: 'arcee-ai/trinity-large-preview:free',      label: 'Trinity Large'  },
  { id: 'google/gemma-3-27b-it:free',               label: 'Gemma 3 27B'    },
];

interface Props {
  /** Called when VORA issues an open_app command. Matches OS.tsx `openWindow`. */
  onOpenApp?: (appId: string, data?: Record<string, unknown>) => void;
  /** Called when VORA issues a close_app command. Matches OS.tsx `closeWindow`. */
  onCloseApp?: (appId: string) => void;
}

const STATUS_LABEL = {
  online:   'VORA · Online',
  thinking: 'VORA · Thinking…',
  offline:  'VORA · Offline',
  error:    'VORA · Error',
};

export function VORAIsland({ onOpenApp, onCloseApp }: Props) {
  const [open,           setOpen]           = useState(false);
  const [input,          setInput]          = useState('');
  const [pos,            setPos]            = useState({ x: 0, y: 0 });
  const [dragging,       setDragging]       = useState(false);
  // Default to OpenRouter so VORA works on the deployed app without a local Ollama
  const [activeProvider,  setActiveProvider]  = useState<VoraProvider>('openrouter');
  const [selectedModel,   setSelectedModel]   = useState(OPENROUTER_MODELS[0].id);

  const dragStart    = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const handleOsCommand = useCallback(
    (cmd: VoraOsCommand) => {
      if (cmd.type === 'open_app' && onOpenApp && cmd.appId) {
        onOpenApp(cmd.appId, cmd.data);
      } else if (cmd.type === 'close_app' && onCloseApp && cmd.appId) {
        onCloseApp(cmd.appId);
      }
    },
    [onOpenApp, onCloseApp]
  );

  const { messages, status, isTyping, sendMessage, clearHistory, stopGenerating } = useVORA({
    onOsCommand: handleOsCommand,
    provider:    activeProvider,
    model:       activeProvider === 'openrouter' ? selectedModel : undefined,
  });

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when island opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── Drag handlers ─────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my),
      });
    };
    const onUp = () => { setDragging(false); dragStart.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // ── Send ──────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Position: anchored bottom-right but draggable ─────────────────
  const style: React.CSSProperties = {
    position: 'fixed',
    right:    `${24 - pos.x}px`,
    bottom:   `${24 - pos.y}px`,
    zIndex:   9000,
    cursor:   dragging ? 'grabbing' : 'default',
  };

  return (
    <div style={style}>
      <AnimatePresence mode="wait">
        {open ? (
          /* ── Expanded chat window ──────────────────────────────── */
          <motion.div
            key="vora-open"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col w-80 h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900"
          >
            {/* Header — drag handle */}
            <div
              className="bg-slate-800/90 cursor-grab select-none shrink-0"
              onMouseDown={onMouseDown}
            >
            {/* Main header row */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/os-assets/ai/vora.svg" alt="VORA" className="w-6 h-6 object-contain" draggable={false} />
                </div>
                <span className="text-xs font-semibold text-slate-200">{STATUS_LABEL[status]}</span>
                <VORAStatusDot status={status} size={7} />
              </div>
              <div className="flex items-center gap-2">
                {/* Model switcher — stops drag from propagating */}
                <div
                  className="flex items-center bg-slate-700/60 rounded-lg p-0.5 cursor-pointer"
                  onMouseDown={(e) => e.stopPropagation()}
                  title={activeProvider === 'ollama' ? 'Local (Ollama) — click to switch to Cloud' : 'Cloud (OpenRouter) — click to switch to Local'}
                >
                  <button
                    onClick={() => setActiveProvider('ollama')}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-all ${
                      activeProvider === 'ollama'
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setActiveProvider('openrouter')}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-all ${
                      activeProvider === 'openrouter'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cloud
                  </button>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    title="Clear history"
                    className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] px-1"
                  >
                    ✕ clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-200 w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12L12 4M4 4l8 8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {/* Model selector row — only when Cloud is active */}
            {activeProvider === 'openrouter' && (
              <div
                className="px-3 pb-2 border-b border-slate-700/40"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-[10px] bg-slate-700/50 text-slate-200 rounded-md px-2 py-1 border border-slate-600/40 outline-none focus:border-emerald-500/60 cursor-pointer"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs gap-2 select-none">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-violet-700/40 to-purple-900/40 border border-violet-500/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/os-assets/ai/vora.svg" alt="VORA" className="w-9 h-9 object-contain" draggable={false} />
                  </div>
                  <p className="text-slate-400 font-medium">Hi, I&apos;m VORA</p>
                  <p className="text-slate-600 text-[10px]">Your AI assistant for BEC OS</p>
                </div>
              )}
              {messages.map((msg) => (
                <VORAMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-2 py-2 border-t border-slate-700/50 bg-slate-900 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder='Ask VORA anything…'
                className="flex-1 bg-slate-800 text-slate-100 text-xs placeholder-slate-600 rounded-xl px-3 py-2 border border-slate-700 outline-none focus:border-violet-600/60 transition-colors disabled:opacity-40"
              />
              <button
                onClick={isTyping ? stopGenerating : handleSend}
                disabled={isTyping ? false : !input.trim()}
                className={`w-8 h-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 ${isTyping ? 'bg-rose-600 hover:bg-rose-500' : 'bg-violet-600 hover:bg-violet-500'}`}
                title={isTyping ? 'Stop VORA' : 'Send message'}
              >
                {isTyping ? (
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
                    <rect x="3" y="3" width="10" height="10" rx="1.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
                    <path d="M14.5 8L2 14l2.5-6L2 2l12.5 6z" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── Collapsed pill (Siri-jelly, royal purple) ─────────── */
          <motion.button
            key="vora-closed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{    opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            onMouseDown={onMouseDown}
            className="relative flex items-center gap-3 pl-3 pr-4 py-2.5 select-none focus:outline-none group"
            title="Open VORA assistant"
            style={{ filter: 'drop-shadow(0 8px 32px rgba(109,40,217,0.55))' }}
          >
            {/* Jelly morphing blob background */}
            <motion.div
              className="absolute inset-0 rounded-[999px]"
              style={{
                background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #4c1d95 100%)',
                border: '1px solid rgba(167,139,250,0.35)',
              }}
              animate={{
                borderRadius: [
                  '40% 60% 55% 45% / 45% 55% 60% 40%',
                  '55% 45% 40% 60% / 60% 40% 45% 55%',
                  '45% 55% 60% 40% / 40% 60% 55% 45%',
                  '60% 40% 45% 55% / 55% 45% 40% 60%',
                  '40% 60% 55% 45% / 45% 55% 60% 40%',
                ],
                scale: [1, 1.03, 0.98, 1.02, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 rounded-[999px] opacity-30"
              style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Logo */}
            <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/os-assets/ai/vora.svg" alt="VORA" className="w-6 h-6 object-contain" draggable={false} />
            </div>
            {/* Label + status */}
            <div className="relative z-10 flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-widest uppercase" style={{ letterSpacing: '0.12em' }}>VORA</span>
              <VORAStatusDot status={status} size={8} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
