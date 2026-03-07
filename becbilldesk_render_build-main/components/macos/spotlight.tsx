"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import type { AppWindow } from "@/components/macos/types"

const spotlightApps = [
    { id: "safari", title: "Safari", icon: "/safari.png", component: "Safari" },
    { id: "mail", title: "Mail", icon: "/mail.png", component: "Mail" },
    { id: "vscode", title: "VS Code", icon: "/vscode.png", component: "VSCode" },
    { id: "notes", title: "Notes", icon: "/notes.png", component: "Notes" },
    { id: "terminal", title: "Terminal", icon: "/terminal.png", component: "Terminal" },
    { id: "spotify", title: "Spotify", icon: "/spotify.png", component: "Spotify" },
    { id: "weather", title: "Weather", icon: "/weather.png", component: "Weather" },
    { id: "payments", title: "BillDesk Payments", icon: "/img/logo.png", component: "Payments" },
    { id: "billdesk-chat", title: "BillDesk Chat", icon: "/facetime.png", component: "BillDeskChat" },
]

interface SpotlightProps {
    onClose: () => void
    onAppClick: (app: AppWindow) => void
}

export default function Spotlight({ onClose, onAppClick }: SpotlightProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredApps, setFilteredApps] = useState<typeof spotlightApps>([])
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    useEffect(() => {
        if (searchTerm) {
            setFilteredApps(spotlightApps.filter((app) => app.title.toLowerCase().includes(searchTerm.toLowerCase())))
        } else {
            setFilteredApps([])
        }
    }, [searchTerm])

    const handleAppClick = (app: (typeof spotlightApps)[0]) => {
        onAppClick({
            id: app.id,
            title: app.title,
            component: app.component,
            position: { x: Math.random() * 200 + 100, y: Math.random() * 100 + 50 },
            size: { width: 900, height: 650 },
        })
        onClose()
    }

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 200)
    }

    return (
        <div
            className={`fixed inset-0 bg-black/20 z-40 flex items-start justify-center pt-32 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-xl bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden transition-transform duration-200 ${isVisible ? "translate-y-0" : "-translate-y-4"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center p-4 border-b border-gray-700">
                    <Search className="w-6 h-6 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Spotlight Search"
                        className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {filteredApps.length > 0 && (
                    <div className="max-h-80 overflow-y-auto">
                        {filteredApps.map((app) => (
                            <div
                                key={app.id}
                                className="flex items-center p-3 hover:bg-blue-500 cursor-pointer transition-colors"
                                onClick={() => handleAppClick(app)}
                            >
                                <img src={app.icon || "/placeholder.svg"} alt={app.title} className="w-8 h-8 mr-3" />
                                <span className="text-white">{app.title}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
