"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import Dock from "@/components/macos/dock"
import Menubar from "@/components/macos/menubar"
import Wallpaper from "@/components/macos/wallpaper"
import Window from "@/components/macos/window"
import Launchpad from "@/components/macos/launchpad"
import ControlCenter from "@/components/macos/control-center"
import Spotlight from "@/components/macos/spotlight"
import DesktopIcons from "@/components/macos/desktop-icons"
import { VoiceAssistant } from "@/components/voice"
import type { VoiceAction } from "@/components/voice"
import type { AppWindow } from "@/components/macos/types"

interface DesktopProps {
    onLogout: () => void
    onSleep: () => void
    onShutdown: () => void
    onRestart: () => void
    initialDarkMode: boolean
    onToggleDarkMode: () => void
    initialBrightness: number
    onBrightnessChange: (value: number) => void
    studentName: string
    studentUsn?: string
}

export default function Desktop({
    onLogout,
    onSleep,
    onShutdown,
    onRestart,
    initialDarkMode,
    onToggleDarkMode,
    initialBrightness,
    onBrightnessChange,
    studentName,
    studentUsn = 'unknown',
}: DesktopProps) {
    const [time, setTime] = useState(new Date())
    // Default windows: BillDesk (right, large) and Chat (left, smaller)
    const [openWindows, setOpenWindows] = useState<AppWindow[]>([
        {
            id: 'billdesk-chat',
            title: 'BillDesk Chat',
            component: 'BillDeskChat',
            position: { x: 20, y: 40 },
            size: { width: 380, height: 500 }
        },
        {
            id: 'payments',
            title: 'BillDesk Payments',
            component: 'Payments',
            position: { x: 420, y: 40 },
            size: { width: 700, height: 550 }
        }
    ])
    const [activeWindowId, setActiveWindowId] = useState<string | null>('payments')
    const [showLaunchpad, setShowLaunchpad] = useState(false)
    const [showControlCenter, setShowControlCenter] = useState(false)
    const [showSpotlight, setShowSpotlight] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode)
    const [screenBrightness, setScreenBrightness] = useState(initialBrightness)
    const desktopRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        setIsDarkMode(initialDarkMode)
    }, [initialDarkMode])

    useEffect(() => {
        setScreenBrightness(initialBrightness)
    }, [initialBrightness])

    const openApp = (app: AppWindow) => {
        const isOpen = openWindows.some((window) => window.id === app.id)

        if (!isOpen) {
            setOpenWindows((prev) => [...prev, app])
        }

        setActiveWindowId(app.id)

        if (showLaunchpad) {
            setShowLaunchpad(false)
        }
    }

    const closeWindow = (id: string) => {
        setOpenWindows((prev) => prev.filter((window) => window.id !== id))

        if (activeWindowId === id && openWindows.length > 1) {
            const remainingWindows = openWindows.filter((window) => window.id !== id)
            setActiveWindowId(remainingWindows[remainingWindows.length - 1].id)
        } else if (openWindows.length <= 1) {
            setActiveWindowId(null)
        }
    }

    const setActiveWindow = (id: string) => {
        setActiveWindowId(id)
    }

    const toggleLaunchpad = () => {
        setShowLaunchpad(!showLaunchpad)
        if (showControlCenter) setShowControlCenter(false)
        if (showSpotlight) setShowSpotlight(false)
    }

    const toggleControlCenter = () => {
        setShowControlCenter(!showControlCenter)
        if (showSpotlight) setShowSpotlight(false)
    }

    const toggleSpotlight = () => {
        setShowSpotlight(!showSpotlight)
        if (showControlCenter) setShowControlCenter(false)
    }

    const toggleDarkMode = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        onToggleDarkMode()
    }

    const updateBrightness = (value: number) => {
        setScreenBrightness(value)
        onBrightnessChange(value)
    }

    const handleDesktopClick = (e: React.MouseEvent) => {
        if (e.target === desktopRef.current) {
            setActiveWindowId(null)
            if (showControlCenter) setShowControlCenter(false)
            if (showSpotlight) setShowSpotlight(false)
        }
    }

    // Voice action handler - dispatches UI actions from voice commands
    const handleVoiceAction = useCallback((action: VoiceAction) => {
        console.log('🎤 Voice action received:', action)

        switch (action.type) {
            case 'SELECT_FEE':
            case 'DESELECT_FEE':
            case 'SELECT_PAYMENT_METHOD':
            case 'CONNECT_WALLET':
            case 'INITIATE_PAYMENT':
                // Dispatch event to window for handling
                window.dispatchEvent(new CustomEvent('voice-action', {
                    detail: action
                }))
                break
            default:
                console.warn('Unknown voice action:', action)
        }
    }, [])

    return (
        <div className="relative">
            <div
                ref={desktopRef}
                className={`relative h-screen w-screen overflow-hidden ${isDarkMode ? "dark" : ""}`}
                onClick={handleDesktopClick}
            >
                <Wallpaper isDarkMode={isDarkMode} />

                <Menubar
                    time={time}
                    onLogout={onLogout}
                    onSleep={onSleep}
                    onShutdown={onShutdown}
                    onRestart={onRestart}
                    onSpotlightClick={toggleSpotlight}
                    onControlCenterClick={toggleControlCenter}
                    isDarkMode={isDarkMode}
                    activeWindow={activeWindowId ? openWindows.find((w) => w.id === activeWindowId) || null : null}
                    studentName={studentName}
                />

                {/* Desktop Icons - layer above wallpaper, below windows */}
                <div className="absolute inset-0 z-[5]">
                    <DesktopIcons isDarkMode={isDarkMode} onOpenApp={openApp} />
                </div>

                {/* Windows - only visible when there are open windows */}
                <div className="absolute inset-0 pt-6 pb-16 z-[10] pointer-events-none">
                    {openWindows.map((window) => (
                        <div key={window.id} className="pointer-events-auto">
                            <Window
                                window={window}
                                isActive={activeWindowId === window.id}
                                onClose={() => closeWindow(window.id)}
                                onFocus={() => setActiveWindow(window.id)}
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    ))}
                </div>

                {/* Launchpad */}
                {showLaunchpad && <Launchpad onAppClick={openApp} onClose={() => setShowLaunchpad(false)} />}

                {/* Control Center */}
                {showControlCenter && (
                    <ControlCenter
                        onClose={() => setShowControlCenter(false)}
                        isDarkMode={isDarkMode}
                        onToggleDarkMode={toggleDarkMode}
                        brightness={screenBrightness}
                        onBrightnessChange={updateBrightness}
                    />
                )}

                {/* Spotlight */}
                {showSpotlight && <Spotlight onClose={() => setShowSpotlight(false)} onAppClick={openApp} />}

                <Dock
                    onAppClick={openApp}
                    onLaunchpadClick={toggleLaunchpad}
                    activeAppIds={openWindows.map((w) => w.id)}
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Brightness overlay */}
            <div
                className="absolute inset-0 bg-black pointer-events-none z-50 transition-opacity duration-300"
                style={{ opacity: Math.max(0.1, 0.9 - screenBrightness / 100) }}
            />

            {/* Voice Assistant - floating button */}
            <VoiceAssistant
                studentName={studentName}
                studentUsn={studentUsn}
                onAction={handleVoiceAction}
            />
        </div>
    )
}
