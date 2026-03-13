'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VORAMessageData } from './VORAMessage';
import type { VoraStatus }      from './VORAStatusDot';
import type { VoraOsCommand }   from '@/lib/agent/types';

export type VoraProvider = 'ollama' | 'openrouter';

interface UseVORAOptions {
  onOsCommand?: (cmd: VoraOsCommand) => void;
  provider?: VoraProvider;
  model?: string;
}

export function useVORA({ onOsCommand, provider = 'ollama', model }: UseVORAOptions = {}) {
  const [messages,   setMessages]   = useState<VORAMessageData[]>([]);
  const [status,     setStatus]     = useState<VoraStatus>('online');
  const [isTyping,   setIsTyping]   = useState(false);
  const historyRef  = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const providerRef = useRef<VoraProvider>(provider);
  const modelRef    = useRef<string | undefined>(model);
  const abortRef    = useRef<AbortController | null>(null);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { modelRef.current = model; }, [model]);

  // ── Check VORA online status on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/agent/status');
        if (!cancelled) {
          const data = await res.json();
          setStatus(data.online && data.modelAvailable ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) setStatus('offline');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      // Add user message to UI
      const userMsg: VORAMessageData = {
        id:        crypto.randomUUID(),
        role:      'user',
        content:   trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      historyRef.current = [...historyRef.current, { role: 'user', content: trimmed }];

      // Show loading bubble
      const loadingId = crypto.randomUUID();
      const loadingMsg: VORAMessageData = {
        id:        loadingId,
        role:      'assistant',
        content:   '',
        timestamp: new Date(),
        loading:   true,
      };
      setMessages((prev) => [...prev, loadingMsg]);
      setIsTyping(true);
      setStatus('thinking');
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/agent/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: historyRef.current, provider: providerRef.current, model: modelRef.current }),
          signal:  controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'VORA returned an error.');
        }

        const reply = data.reply as string;
        historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];

        // Replace loading bubble with real reply
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: reply, loading: false, timestamp: new Date() }
              : m
          )
        );

        // Execute OS-level commands
        if (Array.isArray(data.osCommands)) {
          for (const cmd of data.osCommands as VoraOsCommand[]) {
            onOsCommand?.(cmd);
          }
        }

        setStatus('online');
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        if (isAbort) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? { ...m, content: 'Stopped by user.', loading: false, timestamp: new Date() }
                : m
            )
          );
          setStatus('online');
          return;
        }
        const errText = err instanceof Error ? err.message : 'Something went wrong.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, content: `⚠ ${errText}`, loading: false, timestamp: new Date() }
              : m
          )
        );
        setStatus('error');
      } finally {
        abortRef.current = null;
        setIsTyping(false);
      }
    },
    [isTyping, onOsCommand]
  );

  const stopGenerating = useCallback(() => {
    if (!isTyping) return;
    abortRef.current?.abort();
  }, [isTyping]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return { messages, status, isTyping, sendMessage, clearHistory, stopGenerating };
}
