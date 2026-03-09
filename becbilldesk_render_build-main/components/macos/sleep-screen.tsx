"use client"

interface SleepScreenProps {
    onWakeUp: () => void
    isDarkMode: boolean
}

export default function SleepScreen({ onWakeUp, isDarkMode }: SleepScreenProps) {
    return (
        <div
            className="h-screen w-screen bg-black flex items-center justify-center cursor-pointer"
            onClick={onWakeUp}
        >
            <p className="text-gray-600 text-sm animate-pulse">Click anywhere to wake up</p>
        </div>
    )
}
