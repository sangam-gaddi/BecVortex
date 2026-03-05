'use client';

import { motion } from 'motion/react';

export interface VORAMessageData {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  loading?:  boolean;
}

interface Props {
  message: VORAMessageData;
}

export default function VORAMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-1`}
    >
      {/* VORA avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center mr-1.5 mt-0.5 text-[9px] font-bold text-white select-none">
          V
        </div>
      )}

      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-sm'
            : 'bg-slate-800/90 text-slate-100 border border-slate-700/50 rounded-bl-sm'
        }`}
      >
        {message.loading ? (
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <span>{message.content}</span>
        )}
      </div>
    </motion.div>
  );
}
