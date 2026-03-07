'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Loader2 } from 'lucide-react';
import { RoomContext, RoomAudioRenderer } from '@livekit/components-react';
import { VoiceWaveform } from './VoiceWaveform';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import type { VoiceAction } from './VoiceContext';

interface VoiceAssistantProps {
    studentName: string;
    studentUsn: string;
    onAction?: (action: VoiceAction) => void;
    className?: string;
}

export function VoiceAssistant({
    studentName,
    studentUsn,
    onAction,
    className = '',
}: VoiceAssistantProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const {
        room,
        isConnected,
        isConnecting,
        error,
        agentSpeaking,
        userSpeaking,
        transcript,
        connect,
        disconnect,
        toggleMute,
        sendData,
    } = useVoiceAssistant({
        studentName,
        studentUsn,
        onAction: onAction as any,
    });

    // Handle microphone button click
    const handleMicClick = useCallback(async () => {
        if (!isConnected) {
            await connect();
            setIsExpanded(true);
        } else {
            const newMutedState = await toggleMute();
            setIsMuted(!newMutedState);
        }
    }, [isConnected, connect, toggleMute]);

    // Handle close
    const handleClose = useCallback(() => {
        disconnect();
        setIsExpanded(false);
        setIsMuted(false);
    }, [disconnect]);

    // Notify agent of wallet connection status
    const notifyWalletStatus = useCallback(
        (connected: boolean) => {
            sendData({ type: 'WALLET_STATUS', connected });
        },
        [sendData]
    );

    // Get status text
    const getStatusText = () => {
        if (isConnecting) return 'Connecting...';
        if (error) return 'Connection error';
        if (agentSpeaking) return 'ARIA is speaking...';
        if (userSpeaking) return 'Listening...';
        if (isConnected) return 'Tap to speak';
        return 'Start voice assistant';
    };

    return (
        <>
            {/* Floating button - always visible */}
            <motion.button
                onClick={handleMicClick}
                className={`fixed bottom-24 right-6 z-50 flex items-center justify-center rounded-full shadow-2xl transition-all ${isConnected
                        ? agentSpeaking
                            ? 'bg-green-500 hover:bg-green-600'
                            : userSpeaking
                                ? 'bg-purple-500 hover:bg-purple-600'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    } ${className}`}
                style={{ width: 60, height: 60 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={
                    isConnected && (agentSpeaking || userSpeaking)
                        ? {
                            boxShadow: [
                                '0 0 0 0 rgba(139, 92, 246, 0.4)',
                                '0 0 0 15px rgba(139, 92, 246, 0)',
                            ],
                        }
                        : {}
                }
                transition={
                    isConnected && (agentSpeaking || userSpeaking)
                        ? { duration: 1.5, repeat: Infinity }
                        : {}
                }
            >
                {isConnecting ? (
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : isConnected ? (
                    <VoiceWaveform
                        isActive={agentSpeaking || userSpeaking}
                        isSpeaking={agentSpeaking}
                        size="md"
                    />
                ) : (
                    <Mic className="w-7 h-7 text-white" />
                )}
            </motion.button>

            {/* Expanded panel */}
            <AnimatePresence>
                {isExpanded && isConnected && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-40 right-6 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Volume2 className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm">ARIA</h3>
                                    <p className="text-white/70 text-xs">Voice Assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Status */}
                        <div className="px-4 py-4">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <VoiceWaveform
                                    isActive={agentSpeaking || userSpeaking}
                                    isSpeaking={agentSpeaking}
                                    size="lg"
                                />
                            </div>
                            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                                {getStatusText()}
                            </p>
                        </div>

                        {/* Transcript preview */}
                        {transcript.length > 0 && (
                            <div className="px-4 pb-4 max-h-32 overflow-y-auto">
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    {transcript.slice(-3).map((text, i) => (
                                        <p key={i} className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1">
                                            {text}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={handleMicClick}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                    }`}
                            >
                                {isMuted ? (
                                    <MicOff className="w-5 h-5" />
                                ) : (
                                    <Mic className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio renderer - invisible but necessary for audio playback */}
            {isConnected && (
                <RoomContext.Provider value={room}>
                    <RoomAudioRenderer />
                </RoomContext.Provider>
            )}
        </>
    );
}
