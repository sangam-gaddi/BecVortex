"use client"

import { AppleIcon } from "@/components/macos/icons"

export default function BootScreen() {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
            <AppleIcon className="w-20 h-20 text-white mb-8" />
            <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-white animate-pulse" style={{ width: "60%" }} />
            </div>
        </div>
    )
}
