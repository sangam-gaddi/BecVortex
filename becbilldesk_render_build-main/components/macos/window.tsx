"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Minus, Maximize2 } from "lucide-react"
import Payments from "./apps/payments"
import BillDeskChat from "./apps/billdesk-chat"
import type { AppWindow } from "./types"

// Import all app components
import TransactionVerifier from "../apps/TransactionVerifier"
import ReceiptDownloader from "../apps/ReceiptDownloader"

// ... existing imports

// Placeholder components for other macOS apps
const PlaceholderApp = ({ isDarkMode, title }: { isDarkMode?: boolean; title?: string }) => (
    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
            <p className="text-2xl font-bold mb-2">{title || 'App'}</p>
            <p className="text-gray-500">Coming soon</p>
        </div>
    </div>
)

// Folder app component for desktop folders
const FolderApp = ({ isDarkMode }: { isDarkMode?: boolean }) => (
    <div className={`w-full h-full ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f7]'} p-4`}>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-300/20">
            <img src="/icons/file.svg" alt="folder" className="w-6 h-6" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Folder Contents</span>
        </div>
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <img src="/icons/file.svg" alt="empty" className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ filter: isDarkMode ? 'invert(1)' : 'none' }} />
            <p className="text-sm">This folder is empty</p>
            <p className="text-xs mt-1">Drag files here or use the context menu to create new items</p>
        </div>
    </div>
)

// Terminal App
const TerminalApp = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    const [history, setHistory] = React.useState<string[]>(['Welcome to BEC Terminal v1.0', 'Type "help" for available commands.', ''])
    const [input, setInput] = React.useState('')

    const handleCommand = (cmd: string) => {
        const commands: Record<string, string> = {
            help: 'Available commands: help, clear, date, whoami, echo, neofetch',
            clear: '__CLEAR__',
            date: new Date().toString(),
            whoami: 'student@bec-billdesk',
            neofetch: `
   ____  ____  ____    BEC BillDesk
  | __ )| __ )/ ___|   -----------
  |  _ \\|  _ \\___ \\   OS: macOS (Web)
  | |_) | |_) |__) |  Shell: BEC Terminal
  |____/|____/____/   Theme: ${isDarkMode ? 'Dark' : 'Light'}
            `,
        }

        if (cmd.startsWith('echo ')) {
            return cmd.slice(5)
        }
        return commands[cmd.toLowerCase()] || `Command not found: ${cmd}`
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const result = handleCommand(input.trim())
        if (result === '__CLEAR__') {
            setHistory([])
        } else {
            setHistory(prev => [...prev, `$ ${input}`, result, ''])
        }
        setInput('')
    }

    return (
        <div className="w-full h-full bg-[#1e1e1e] text-green-400 font-mono text-sm p-4 overflow-auto">
            <div className="whitespace-pre-wrap">
                {history.map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <form onSubmit={onSubmit} className="flex items-center">
                <span className="text-green-500">$ </span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-green-400 ml-1"
                    autoFocus
                />
            </form>
        </div>
    )
}

// Notes App
const NotesApp = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    const [notes, setNotes] = React.useState<{ id: string, title: string, content: string }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('macosNotes')
            return saved ? JSON.parse(saved) : [{ id: '1', title: 'Welcome', content: 'Welcome to Notes! Click to edit.' }]
        }
        return [{ id: '1', title: 'Welcome', content: 'Welcome to Notes!' }]
    })
    const [activeNote, setActiveNote] = React.useState(notes[0]?.id || '')

    React.useEffect(() => {
        localStorage.setItem('macosNotes', JSON.stringify(notes))
    }, [notes])

    const addNote = () => {
        const newNote = { id: Date.now().toString(), title: 'New Note', content: '' }
        setNotes(prev => [...prev, newNote])
        setActiveNote(newNote.id)
    }

    const updateNote = (id: string, field: 'title' | 'content', value: string) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
    }

    const currentNote = notes.find(n => n.id === activeNote)
    const bg = isDarkMode ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f7]'
    const bgSide = isDarkMode ? 'bg-[#2d2d2d]' : 'bg-white'
    const text = isDarkMode ? 'text-white' : 'text-gray-900'

    return (
        <div className={`w-full h-full flex ${bg}`}>
            <div className={`w-48 ${bgSide} border-r border-gray-600/20 flex flex-col`}>
                <button onClick={addNote} className={`p-3 ${text} text-left text-sm font-semibold border-b border-gray-600/20 hover:bg-yellow-500/10`}>
                    + New Note
                </button>
                <div className="flex-1 overflow-auto">
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setActiveNote(note.id)}
                            className={`p-3 cursor-pointer border-b border-gray-600/10 ${activeNote === note.id ? 'bg-yellow-500/20' : ''} ${text}`}
                        >
                            <p className="text-sm font-medium truncate">{note.title || 'Untitled'}</p>
                            <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{note.content.slice(0, 30)}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 p-4 flex flex-col">
                {currentNote && (
                    <>
                        <input
                            type="text"
                            value={currentNote.title}
                            onChange={(e) => updateNote(currentNote.id, 'title', e.target.value)}
                            className={`text-xl font-bold mb-3 bg-transparent outline-none ${text}`}
                            placeholder="Title"
                        />
                        <textarea
                            value={currentNote.content}
                            onChange={(e) => updateNote(currentNote.id, 'content', e.target.value)}
                            className={`flex-1 bg-transparent outline-none resize-none ${text}`}
                            placeholder="Start typing..."
                        />
                    </>
                )}
            </div>
        </div>
    )
}

// Spotify App
const SpotifyApp = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    const [playing, setPlaying] = React.useState(false)
    const [currentTrack, setCurrentTrack] = React.useState(0)

    const tracks = [
        { title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20' },
        { title: 'Shape of You', artist: 'Ed Sheeran', duration: '3:53' },
        { title: 'Dance Monkey', artist: 'Tones and I', duration: '3:29' },
        { title: 'Someone Like You', artist: 'Adele', duration: '4:45' },
        { title: 'Uptown Funk', artist: 'Bruno Mars', duration: '4:30' },
    ]

    return (
        <div className="w-full h-full bg-gradient-to-b from-[#1db954]/30 to-[#121212] text-white">
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">🎵 Your Library</h2>
                <div className="space-y-2">
                    {tracks.map((track, i) => (
                        <div
                            key={i}
                            onClick={() => { setCurrentTrack(i); setPlaying(true); }}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/10 ${currentTrack === i ? 'bg-white/20' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 text-center ${currentTrack === i && playing ? 'text-[#1db954]' : 'text-gray-400'}`}>
                                    {currentTrack === i && playing ? '▶' : i + 1}
                                </span>
                                <div>
                                    <p className={`font-medium ${currentTrack === i ? 'text-[#1db954]' : ''}`}>{track.title}</p>
                                    <p className="text-sm text-gray-400">{track.artist}</p>
                                </div>
                            </div>
                            <span className="text-sm text-gray-400">{track.duration}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-[#181818] border-t border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded" />
                    <div>
                        <p className="font-medium text-sm">{tracks[currentTrack].title}</p>
                        <p className="text-xs text-gray-400">{tracks[currentTrack].artist}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentTrack(p => Math.max(0, p - 1))} className="text-xl">⏮</button>
                    <button onClick={() => setPlaying(!playing)} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-xl">
                        {playing ? '⏸' : '▶'}
                    </button>
                    <button onClick={() => setCurrentTrack(p => Math.min(tracks.length - 1, p + 1))} className="text-xl">⏭</button>
                </div>
                <div className="w-24" />
            </div>
        </div>
    )
}

// Safari (Browser)
const SafariApp = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    const [url, setUrl] = React.useState('https://www.google.com')
    const bg = isDarkMode ? 'bg-[#2d2d2d]' : 'bg-gray-100'
    const text = isDarkMode ? 'text-white' : 'text-gray-900'

    return (
        <div className={`w-full h-full flex flex-col ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            <div className={`${bg} p-2 flex items-center gap-2 border-b border-gray-600/20`}>
                <div className="flex gap-1">
                    <button className="px-2 py-1 rounded hover:bg-gray-500/20">←</button>
                    <button className="px-2 py-1 rounded hover:bg-gray-500/20">→</button>
                    <button className="px-2 py-1 rounded hover:bg-gray-500/20">⟳</button>
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-[#3d3d3d]' : 'bg-white'} ${text} text-sm outline-none`}
                />
            </div>
            <iframe src={url} className="flex-1 w-full border-0" title="Safari" sandbox="allow-scripts allow-same-origin" />
        </div>
    )
}

// Weather App
const WeatherApp = ({ isDarkMode }: { isDarkMode?: boolean }) => (
    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6">
        <div className="text-center">
            <p className="text-lg opacity-80">Bangalore, IN</p>
            <p className="text-6xl font-light my-4">☀️</p>
            <p className="text-5xl font-bold">24°</p>
            <p className="text-lg mt-2">Sunny</p>
            <p className="text-sm opacity-80 mt-1">H: 28° L: 18°</p>
        </div>
        <div className="mt-8 grid grid-cols-5 gap-2 text-center text-sm">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                <div key={day} className="bg-white/20 rounded-xl p-3">
                    <p className="opacity-80">{day}</p>
                    <p className="text-xl my-1">{['☀️', '🌤️', '☁️', '🌧️', '☀️'][i]}</p>
                    <p>{[24, 22, 20, 19, 25][i]}°</p>
                </div>
            ))}
        </div>
    </div>
)

// GitHub App
const GitHubApp = ({ isDarkMode }: { isDarkMode?: boolean }) => (
    <div className={`w-full h-full ${isDarkMode ? 'bg-[#0d1117] text-white' : 'bg-[#f6f8fa] text-gray-900'}`}>
        <div className={`${isDarkMode ? 'bg-[#161b22]' : 'bg-white'} border-b border-gray-600/20 p-4`}>
            <div className="flex items-center gap-3">
                <img src="/github.png" alt="GitHub" className="w-8 h-8" />
                <span className="font-bold">GitHub</span>
            </div>
        </div>
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">📂 Your Repositories</h2>
            {['bec-billdesk', 'macos-web-ui', 'react-components', 'blockchain-payments'].map((repo, i) => (
                <div key={repo} className={`p-4 rounded-lg mb-3 ${isDarkMode ? 'bg-[#161b22]' : 'bg-white'} border border-gray-600/20`}>
                    <p className="font-semibold text-blue-500">{repo}</p>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {['Next.js payment platform', 'macOS-style web interface', 'Reusable React components', 'Crypto payment integration'][i]}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>⭐ {[12, 8, 24, 5][i]}</span>
                        <span>🍴 {[3, 2, 8, 1][i]}</span>
                        <span>● TypeScript</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

// YouTube App
const YouTubeApp = ({ isDarkMode }: { isDarkMode?: boolean }) => (
    <div className={`w-full h-full ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
        <div className={`${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-white'} border-b border-gray-600/20 p-3 flex items-center gap-4`}>
            <span className="text-red-600 font-bold text-xl">▶ YouTube</span>
            <input
                type="text"
                placeholder="Search..."
                className={`flex-1 px-4 py-2 rounded-full ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-gray-100'} outline-none`}
            />
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
            {[
                { title: 'Learn React in 1 Hour', views: '1.2M', channel: 'Code Academy' },
                { title: 'Next.js Full Course', views: '890K', channel: 'Dev Ed' },
                { title: 'TypeScript Tutorial', views: '2.1M', channel: 'Fireship' },
                { title: 'CSS Animations', views: '456K', channel: 'Kevin Powell' },
            ].map((video, i) => (
                <div key={i} className="cursor-pointer group">
                    <div className={`aspect-video rounded-xl ${['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'][i]} flex items-center justify-center text-white text-4xl`}>
                        ▶
                    </div>
                    <p className={`mt-2 font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} group-hover:text-blue-500`}>{video.title}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{video.channel} • {video.views} views</p>
                </div>
            ))}
        </div>
    </div>
)

const componentMap: Record<string, React.ComponentType<{ isDarkMode?: boolean }>> = {
    Payments,
    BillDeskChat,
    Folder: FolderApp,
    Safari: SafariApp,
    Terminal: TerminalApp,
    Notes: NotesApp,
    Mail: (props) => <PlaceholderApp {...props} title="Mail" />,
    Spotify: SpotifyApp,
    Weather: WeatherApp,
    VSCode: (props) => <PlaceholderApp {...props} title="VS Code" />,
    FaceTime: (props) => <PlaceholderApp {...props} title="FaceTime" />,
    GitHub: GitHubApp,
    YouTube: YouTubeApp,
    Snake: (props) => <PlaceholderApp {...props} title="Snake" />,
    Verifier: TransactionVerifier,
    Receipts: ReceiptDownloader,
}

interface WindowProps {
    window: AppWindow
    isActive: boolean
    onClose: () => void
    onFocus: () => void
    isDarkMode: boolean
}

export default function Window({ window, isActive, onClose, onFocus, isDarkMode }: WindowProps) {
    const [position, setPosition] = useState(window.position)
    const [size, setSize] = useState(window.size)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isMaximized, setIsMaximized] = useState(false)
    const [preMaximizeState, setPreMaximizeState] = useState({ position, size })
    const [isResizing, setIsResizing] = useState(false)
    const [resizeDirection, setResizeDirection] = useState<string | null>(null)
    const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
    const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 })

    const windowRef = useRef<HTMLDivElement>(null)

    const AppComponent = componentMap[window.component]

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y,
                })
            } else if (isResizing && resizeDirection) {
                e.preventDefault()
                const dx = e.clientX - resizeStartPos.x
                const dy = e.clientY - resizeStartPos.y

                let newWidth = resizeStartSize.width
                let newHeight = resizeStartSize.height
                let newX = position.x
                let newY = position.y

                const minWidth = 300
                const minHeight = 200

                if (resizeDirection.includes("e")) {
                    newWidth = Math.max(minWidth, resizeStartSize.width + dx)
                }
                if (resizeDirection.includes("s")) {
                    newHeight = Math.max(minHeight, resizeStartSize.height + dy)
                }
                if (resizeDirection.includes("w")) {
                    const proposedWidth = resizeStartSize.width - dx
                    if (proposedWidth >= minWidth) {
                        newWidth = proposedWidth
                        newX = position.x + dx
                    }
                }
                if (resizeDirection.includes("n")) {
                    const proposedHeight = resizeStartSize.height - dy
                    if (proposedHeight >= minHeight) {
                        newHeight = proposedHeight
                        newY = position.y + dy
                    }
                }

                setSize({ width: newWidth, height: newHeight })
                if (resizeDirection.includes("w") || resizeDirection.includes("n")) {
                    setPosition({ x: newX, y: newY })
                }
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            setIsResizing(false)
            setResizeDirection(null)
        }

        if (isDragging || isResizing) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging, dragOffset, isResizing, resizeDirection, resizeStartPos, resizeStartSize, position])

    const handleTitleBarMouseDown = (e: React.MouseEvent) => {
        if (isMaximized) return

        if ((e.target as HTMLElement).closest(".window-controls")) {
            return
        }

        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        })

        onFocus()
    }

    const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()

        setIsResizing(true)
        setResizeDirection(direction)
        setResizeStartPos({
            x: e.clientX,
            y: e.clientY,
        })
        setResizeStartSize({
            width: size.width,
            height: size.height,
        })

        onFocus()
    }

    const toggleMaximize = () => {
        if (isMaximized) {
            setPosition(preMaximizeState.position)
            setSize(preMaximizeState.size)
        } else {
            setPreMaximizeState({ position, size })

            const availableHeight = globalThis.innerHeight - 26

            setPosition({ x: 0, y: 26 })
            setSize({
                width: globalThis.innerWidth,
                height: availableHeight - 70,
            })
        }

        setIsMaximized(!isMaximized)
    }

    const handleMinimize = () => {
        onClose()
    }

    const titleBarClass = isDarkMode
        ? isActive
            ? "bg-gray-800"
            : "bg-gray-900"
        : isActive
            ? "bg-gray-200"
            : "bg-gray-100"

    const contentBgClass = isDarkMode ? "bg-gray-900" : "bg-white"
    const textClass = isDarkMode ? "text-white" : "text-gray-800"

    return (
        <div
            ref={windowRef}
            className={`absolute rounded-lg overflow-hidden shadow-2xl transition-shadow ${isActive ? "shadow-2xl z-10" : "shadow-lg z-0"}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
            }}
            onClick={onFocus}
        >
            {/* Title bar */}
            <div className={`h-8 flex items-center px-3 ${titleBarClass}`} onMouseDown={handleTitleBarMouseDown}>
                <div className="window-controls flex items-center space-x-2 mr-4">
                    <button
                        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"
                        onClick={onClose}
                    >
                        <X className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100" />
                    </button>
                    <button
                        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"
                        onClick={handleMinimize}
                    >
                        <Minus className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100" />
                    </button>
                    <button
                        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"
                        onClick={toggleMaximize}
                    >
                        <Maximize2 className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100" />
                    </button>
                </div>

                <div className={`flex-1 text-center text-sm font-medium truncate ${textClass}`}>{window.title}</div>

                <div className="w-16"></div>
            </div>

            {/* Window content */}
            <div className={`${contentBgClass} h-[calc(100%-2rem)] overflow-auto`}>
                {AppComponent ? <AppComponent isDarkMode={isDarkMode} /> : <div className="p-4">Content not available</div>}
            </div>

            {/* Resize handles */}
            {!isMaximized && (
                <>
                    <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
                    />
                    <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "se")}
                    />

                    <div
                        className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "n")}
                    />
                    <div
                        className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "s")}
                    />
                    <div
                        className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "w")}
                    />
                    <div
                        className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize z-20"
                        onMouseDown={(e) => handleResizeMouseDown(e, "e")}
                    />
                </>
            )}
        </div>
    )
}
