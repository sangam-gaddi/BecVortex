'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { RoomAudioRenderer, useRoomContext } from '@livekit/components-react';

interface ConnectionDetails {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
}

interface UseVoiceAssistantOptions {
    studentName?: string;
    studentUsn?: string;
    onAction?: (action: { type: string; payload: any }) => void;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
    const { studentName = 'Student', studentUsn = 'unknown', onAction } = options;

    const [room] = useState(() => new Room());
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agentSpeaking, setAgentSpeaking] = useState(false);
    const [userSpeaking, setUserSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);

    // Fetch connection details from API
    const fetchConnectionDetails = useCallback(async (): Promise<ConnectionDetails> => {
        const response = await fetch('/api/voice/connection-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentName, studentUsn }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to get connection details');
        }

        return response.json();
    }, [studentName, studentUsn]);

    // Connect to voice session
    const connect = useCallback(async () => {
        if (isConnected || isConnecting) return;

        setIsConnecting(true);
        setError(null);

        try {
            const details = await fetchConnectionDetails();
            console.log('🎤 Got connection details:', details.roomName);

            // Connect to the room first
            await room.connect(details.serverUrl, details.participantToken, {
                autoSubscribe: true,
            });

            console.log('🎤 Connected to room, enabling microphone...');

            // Enable microphone after connecting
            await room.localParticipant.setMicrophoneEnabled(true);

            setIsConnected(true);
            console.log('🎤 Voice session ready:', details.roomName);
        } catch (err) {
            console.error('Voice connection error:', err);
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsConnecting(false);
        }
    }, [room, isConnected, isConnecting, fetchConnectionDetails]);

    // Disconnect from voice session
    const disconnect = useCallback(() => {
        room.disconnect();
        setIsConnected(false);
        setAgentSpeaking(false);
        setUserSpeaking(false);
        console.log('🎤 Disconnected from voice session');
    }, [room]);

    // Toggle mute
    const toggleMute = useCallback(async () => {
        const currentlyEnabled = room.localParticipant.isMicrophoneEnabled;
        await room.localParticipant.setMicrophoneEnabled(!currentlyEnabled);
        return !currentlyEnabled;
    }, [room]);

    // Send data to agent
    const sendData = useCallback(async (data: object) => {
        if (!isConnected) return;

        const encoder = new TextEncoder();
        const payload = encoder.encode(JSON.stringify(data));
        await room.localParticipant.publishData(payload, { reliable: true });
    }, [room, isConnected]);

    // Set up room event listeners
    useEffect(() => {
        const handleDisconnected = () => {
            setIsConnected(false);
            setAgentSpeaking(false);
            setUserSpeaking(false);
        };

        const handleDataReceived = (
            payload: Uint8Array,
            participant?: RemoteParticipant
        ) => {
            try {
                const decoder = new TextDecoder();
                const message = JSON.parse(decoder.decode(payload));

                console.log('📩 [VOICE] Received message from agent:', message);

                // Handle voice action from agent
                if (message.type === 'VOICE_ACTION') {
                    const action = {
                        type: message.action,
                        payload: message.payload || {},
                    };

                    console.log('🎯 [VOICE] Dispatching action to window:', action);

                    // Dispatch as window custom event (for any listening component)
                    window.dispatchEvent(new CustomEvent('voiceAction', { detail: action }));
                    console.log('✅ [VOICE] Window event dispatched!');

                    // Also call onAction callback if provided
                    if (onAction) {
                        onAction(action);
                        console.log('✅ [VOICE] onAction callback called!');
                    }
                }

                // Handle transcript updates
                if (message.type === 'TRANSCRIPT') {
                    setTranscript(prev => [...prev, message.text]);
                }
            } catch (err) {
                console.error('Error parsing data message:', err);
            }
        };

        const handleActiveSpeakersChanged = (speakers: any[]) => {
            // Check if agent is speaking (remote participant)
            const agentIsSpeaking = speakers.some(
                (s) => s.identity !== room.localParticipant.identity
            );
            setAgentSpeaking(agentIsSpeaking);

            // Check if user is speaking (local participant)
            const userIsSpeaking = speakers.some(
                (s) => s.identity === room.localParticipant.identity
            );
            setUserSpeaking(userIsSpeaking);
        };

        room.on(RoomEvent.Disconnected, handleDisconnected);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

        return () => {
            room.off(RoomEvent.Disconnected, handleDisconnected);
            room.off(RoomEvent.DataReceived, handleDataReceived);
            room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
        };
    }, [room, onAction]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (room.state !== 'disconnected') {
                room.disconnect();
            }
        };
    }, [room]);

    return {
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
    };
}
