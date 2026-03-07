'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Voice action types that can be triggered by the AI agent
export type VoiceAction =
    | { type: 'SELECT_FEE'; payload: { feeId: string } }
    | { type: 'DESELECT_FEE'; payload: { feeId: string } }
    | { type: 'SELECT_PAYMENT_METHOD'; payload: { method: 'crypto' | 'upi' | 'netbanking' | 'cash' } }
    | { type: 'CONNECT_WALLET'; payload: Record<string, never> }
    | { type: 'INITIATE_PAYMENT'; payload: { feeIds: string[]; method: string } };

interface VoiceContextType {
    // Voice state
    isListening: boolean;
    isSpeaking: boolean;
    isConnected: boolean;
    transcript: string;

    // Action handlers (to be set by the parent component)
    onAction: ((action: VoiceAction) => void) | null;
    setOnAction: (handler: (action: VoiceAction) => void) => void;

    // State setters (used by VoiceAssistant)
    setIsListening: (value: boolean) => void;
    setIsSpeaking: (value: boolean) => void;
    setIsConnected: (value: boolean) => void;
    setTranscript: (value: string) => void;

    // Dispatch action from voice agent
    dispatchAction: (action: VoiceAction) => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [onAction, setOnActionHandler] = useState<((action: VoiceAction) => void) | null>(null);

    const setOnAction = useCallback((handler: (action: VoiceAction) => void) => {
        setOnActionHandler(() => handler);
    }, []);

    const dispatchAction = useCallback((action: VoiceAction) => {
        console.log('🎤 Voice Action:', action);
        if (onAction) {
            onAction(action);
        }
    }, [onAction]);

    return (
        <VoiceContext.Provider
            value={{
                isListening,
                isSpeaking,
                isConnected,
                transcript,
                onAction,
                setOnAction,
                setIsListening,
                setIsSpeaking,
                setIsConnected,
                setTranscript,
                dispatchAction,
            }}
        >
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoice() {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
}
