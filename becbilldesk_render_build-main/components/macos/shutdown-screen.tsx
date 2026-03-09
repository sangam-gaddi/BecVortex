"use client"

import { AppleIcon } from "@/components/macos/icons"

interface ShutdownScreenProps {
    onBoot: () => void
}

export default function ShutdownScreen({ onBoot }: ShutdownScreenProps) {
    return (
        <div
            className="h-screen w-screen bg-black flex flex-col items-center justify-center cursor-pointer"
            onClick={onBoot}
        >
            <AppleIcon className="w-16 h-16 text-gray-700 mb-4" />
            <p className="text-gray-600 text-sm">Click to power on</p>
        </div>
    )
}
