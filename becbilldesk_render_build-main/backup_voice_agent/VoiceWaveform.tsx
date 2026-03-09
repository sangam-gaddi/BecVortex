'use client';

import { motion } from 'framer-motion';

interface VoiceWaveformProps {
    isActive: boolean;
    isSpeaking: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function VoiceWaveform({ isActive, isSpeaking, size = 'md' }: VoiceWaveformProps) {
    const barCount = 5;
    const sizeConfig = {
        sm: { height: 16, barWidth: 3, gap: 2 },
        md: { height: 24, barWidth: 4, gap: 3 },
        lg: { height: 32, barWidth: 5, gap: 4 },
    };

    const config = sizeConfig[size];
    const color = isSpeaking ? '#22c55e' : '#8b5cf6'; // Green when speaking, purple when listening

    return (
        <div
            className="flex items-center justify-center"
            style={{ gap: config.gap, height: config.height }}
        >
            {Array.from({ length: barCount }).map((_, i) => (
                <motion.div
                    key={i}
                    className="rounded-full"
                    style={{
                        width: config.barWidth,
                        backgroundColor: color,
                    }}
                    animate={
                        isActive
                            ? {
                                height: [
                                    config.height * 0.3,
                                    config.height * (0.5 + Math.random() * 0.5),
                                    config.height * 0.3,
                                ],
                                opacity: [0.7, 1, 0.7],
                            }
                            : {
                                height: config.height * 0.2,
                                opacity: 0.3,
                            }
                    }
                    transition={
                        isActive
                            ? {
                                duration: 0.5 + Math.random() * 0.3,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                delay: i * 0.1,
                                ease: 'easeInOut',
                            }
                            : {
                                duration: 0.3,
                            }
                    }
                />
            ))}
        </div>
    );
}
