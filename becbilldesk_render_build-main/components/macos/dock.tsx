"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"
import type { AppWindow } from "@/components/macos/types"

const dockApps = [
    { id: "launchpad", title: "Launchpad", icon: "/launchpad.png", component: "Launchpad", isSystem: true },
    { id: "payments", title: "BillDesk", icon: "/billdesk-icon.png", component: "Payments" },
    { id: "billdesk-chat", title: "Chat", icon: "/facetime.png", component: "BillDeskChat" },
    { id: "safari", title: "Safari", icon: "/safari.png", component: "Safari" },
    { id: "terminal", title: "Terminal", icon: "/terminal.png", component: "Terminal" },
    { id: "notes", title: "Notes", icon: "/notes.png", component: "Notes" },
    { id: "spotify", title: "Spotify", icon: "/spotify.png", component: "Spotify" },
    { id: "weather", title: "Weather", icon: "/weather.png", component: "Weather" },
]

interface DockProps {
    onAppClick: (app: AppWindow) => void
    onLaunchpadClick: () => void
    activeAppIds: string[]
    isDarkMode: boolean
}

export default function Dock({ onAppClick, onLaunchpadClick, activeAppIds, isDarkMode }: DockProps) {
    const [mouseX, setMouseX] = useState<number | null>(null)
    const dockRef = useRef<HTMLDivElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)

        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    useEffect(() => {
        if (!showMobileMenu) return

        const handleClickOutside = (event: MouseEvent) => {
            if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
                setShowMobileMenu(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [showMobileMenu])

    const handleAppClick = (app: (typeof dockApps)[0]) => {
        if (app.id === "launchpad") {
            onLaunchpadClick()
            return
        }

        onAppClick({
            id: app.id,
            title: app.title,
            component: app.component,
            position: { x: Math.random() * 200 + 100, y: Math.random() * 100 + 50 },
            size: { width: 900, height: 650 },
        })

        if (showMobileMenu) {
            setShowMobileMenu(false)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dockRef.current && !isMobile) {
            const rect = dockRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            setMouseX(x)
        }
    }

    const handleMouseLeave = () => {
        setMouseX(null)
    }

    const getIconScale = (index: number, iconCount: number) => {
        if (mouseX === null || isMobile) return 1

        const dockWidth = dockRef.current?.offsetWidth || 0
        const iconWidth = dockWidth / iconCount
        const iconPosition = iconWidth * (index + 0.5)

        const distance = Math.abs(mouseX - iconPosition)

        const maxScale = 2
        const maxDistance = iconWidth * 2.5

        if (distance > maxDistance) return 1

        const scale = 1 + (maxScale - 1) * Math.pow(1 - distance / maxDistance, 2)

        return scale
    }

    const visibleApps = isMobile ? dockApps.slice(0, 4) : dockApps
    const hiddenApps = isMobile ? dockApps.slice(4) : []

    return (
        <div ref={dockRef} className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-50">
            {isMobile && showMobileMenu && (
                <div
                    className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 w-[280px] 
          ${isDarkMode ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-xl 
          rounded-xl border border-white/20 shadow-lg p-4 mb-2`}
                >
                    <div className="grid grid-cols-4 gap-4">
                        {hiddenApps.map((app) => (
                            <div
                                key={app.id}
                                className="flex flex-col items-center justify-center"
                                onClick={() => handleAppClick(app)}
                            >
                                <div className="w-14 h-14 flex items-center justify-center">
                                    <img
                                        src={app.icon || "/placeholder.svg"}
                                        alt={app.title}
                                        className="w-12 h-12 object-contain"
                                        draggable="false"
                                    />
                                </div>
                                <span className={`text-xs mt-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>{app.title}</span>
                                {activeAppIds.includes(app.id) && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div
                className={`px-3 py-2 rounded-2xl 
          ${isDarkMode ? "bg-white/10" : "bg-white/60"} backdrop-blur-xl 
          flex items-end border border-white/20 shadow-lg
          ${isMobile ? "h-20" : "h-16"}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {visibleApps.map((app, index) => {
                    const scale = getIconScale(index, visibleApps.length)

                    return (
                        <div
                            key={app.id}
                            className={`flex flex-col items-center justify-end h-full ${isMobile ? "px-3" : "px-2"}`}
                            style={{
                                transform: isMobile ? "none" : `translateY(${(scale - 1) * -8}px)`,
                                zIndex: scale > 1 ? 10 : 1,
                                transition: mouseX === null ? "transform 0.2s ease-out" : "none",
                            }}
                            onClick={() => handleAppClick(app)}
                        >
                            <div
                                className="relative cursor-pointer"
                                style={{
                                    transform: isMobile ? "none" : `scale(${scale})`,
                                    transformOrigin: "bottom center",
                                    transition: mouseX === null ? "transform 0.2s ease-out" : "none",
                                }}
                            >
                                <img
                                    src={app.icon || "/placeholder.svg"}
                                    alt={app.title}
                                    className={`object-contain ${isMobile ? "w-14 h-14" : "w-12 h-12"}`}
                                    draggable="false"
                                />

                                {!isMobile && scale > 1.5 && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/70 text-white text-xs rounded whitespace-nowrap">
                                        {app.title}
                                    </div>
                                )}

                                {activeAppIds.includes(app.id) && (
                                    <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {isMobile && (
                    <div
                        className="flex flex-col items-center justify-end h-full px-3"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        <div className="relative cursor-pointer">
                            <div
                                className={`w-14 h-14 rounded-full flex items-center justify-center 
                ${isDarkMode ? "bg-gray-700" : "bg-gray-200"} 
                ${showMobileMenu ? (isDarkMode ? "bg-blue-700" : "bg-blue-200") : ""}`}
                            >
                                <MoreHorizontal className={`w-8 h-8 ${isDarkMode ? "text-white" : "text-gray-800"}`} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
