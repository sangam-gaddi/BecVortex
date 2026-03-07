"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Users, MessageCircle, Search, MoreHorizontal, Phone, Video, Smile, RefreshCw } from "lucide-react"
import { useChat } from "@/hooks/useChat"

interface BillDeskChatProps {
    isDarkMode?: boolean
}

type ChatView = 'global' | string

export default function BillDeskChat({ isDarkMode }: BillDeskChatProps) {
    const [message, setMessage] = useState('')
    const [currentView, setCurrentView] = useState<ChatView>('global')
    const [studentData, setStudentData] = useState<{ usn: string; studentName: string } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadStudent = async () => {
            try {
                const response = await fetch('/api/auth/me')
                if (response.ok) {
                    const data = await response.json()
                    setStudentData({
                        usn: data.student?.usn,
                        studentName: data.student?.studentName
                    })
                }
            } catch (error) {
                console.error('Failed to load student:', error)
            }
        }
        loadStudent()
    }, [])

    const {
        isConnected,
        globalMessages,
        privateMessages,
        onlineUsers,
        typingUsers,
        sendGlobalMessage,
        sendPrivateMessage,
        emitTypingGlobal,
        emitTypingPrivate
    } = useChat(studentData?.usn || '', studentData?.studentName || '')

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [globalMessages, privateMessages, currentView])

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || !studentData) return

        if (currentView === 'global') {
            sendGlobalMessage(message)
        } else {
            sendPrivateMessage(currentView, message)
        }
        setMessage('')
    }

    const handleTyping = () => {
        if (currentView === 'global') {
            emitTypingGlobal()
        } else {
            emitTypingPrivate(currentView)
        }
    }

    const currentMessages = currentView === 'global'
        ? globalMessages
        : privateMessages[currentView] || []

    const formatTime = (date: Date | string) => new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })

    const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    // macOS-style colors
    const bgPrimary = isDarkMode ? "bg-[#1e1e1e]" : "bg-[#f5f5f7]"
    const bgSecondary = isDarkMode ? "bg-[#2d2d2d]" : "bg-white"
    const bgTertiary = isDarkMode ? "bg-[#3d3d3d]" : "bg-[#f0f0f0]"
    const borderColor = isDarkMode ? "border-[#3d3d3d]" : "border-[#d1d1d6]"
    const textPrimary = isDarkMode ? "text-white" : "text-[#1d1d1f]"
    const textSecondary = isDarkMode ? "text-[#86868b]" : "text-[#6e6e73]"

    if (!studentData) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${bgPrimary}`}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                    <p className={textSecondary}>Connecting...</p>
                </div>
            </div>
        )
    }

    const currentChatUser = currentView !== 'global' ? onlineUsers.find(u => u.usn === currentView) : null

    return (
        <div className={`w-full h-full ${bgPrimary} flex`}>
            {/* Sidebar */}
            <div className={`w-72 ${bgSecondary} border-r ${borderColor} flex flex-col`}>
                {/* Sidebar Header */}
                <div className={`p-4 border-b ${borderColor}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`text-lg font-semibold ${textPrimary}`}>Messages</h2>
                        <button className={`p-1.5 rounded-md hover:${bgTertiary}`}>
                            <MoreHorizontal className={`w-5 h-5 ${textSecondary}`} />
                        </button>
                    </div>
                    <div className={`relative`}>
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full ${bgTertiary} ${textPrimary} pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]`}
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {/* Global Chat */}
                    <button
                        onClick={() => setCurrentView('global')}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${currentView === 'global'
                            ? 'bg-[#0071e3] text-white'
                            : `hover:${bgTertiary}`
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentView === 'global' ? 'bg-white/20' : 'bg-gradient-to-br from-green-400 to-green-600'
                            }`}>
                            <Users className={`w-5 h-5 ${currentView === 'global' ? 'text-white' : 'text-white'}`} />
                        </div>
                        <div className="flex-1 text-left">
                            <p className={`font-medium text-sm ${currentView === 'global' ? 'text-white' : textPrimary}`}>
                                Global Chat
                            </p>
                            <p className={`text-xs truncate ${currentView === 'global' ? 'text-white/70' : textSecondary}`}>
                                {globalMessages.length > 0
                                    ? globalMessages[globalMessages.length - 1].message
                                    : 'No messages yet'}
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`text-xs ${currentView === 'global' ? 'text-white/70' : textSecondary}`}>
                                {globalMessages.length > 0 && formatTime(globalMessages[globalMessages.length - 1].timestamp)}
                            </span>
                            {globalMessages.length > 0 && currentView !== 'global' && (
                                <span className="w-2 h-2 bg-[#0071e3] rounded-full mt-1" />
                            )}
                        </div>
                    </button>

                    {/* Online Users Section */}
                    <div className={`px-4 py-2 ${bgTertiary} flex items-center justify-between`}>
                        <p className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>
                            Online — {onlineUsers.length}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className={`p-1 rounded-md hover:bg-[#0071e3]/10 transition-colors`}
                            title="Refresh online users"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${textSecondary} hover:text-[#0071e3]`} />
                        </button>
                    </div>

                    {/* User List */}
                    {onlineUsers.map(user => (
                        <button
                            key={user.usn}
                            onClick={() => setCurrentView(user.usn)}
                            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${currentView === user.usn
                                ? 'bg-[#0071e3] text-white'
                                : `hover:${bgTertiary}`
                                }`}
                        >
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${currentView === user.usn ? 'bg-white/20' : 'bg-gradient-to-br from-purple-400 to-purple-600'
                                    }`}>
                                    {getInitials(user.name)}
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className={`font-medium text-sm ${currentView === user.usn ? 'text-white' : textPrimary}`}>
                                    {user.name}
                                </p>
                                <p className={`text-xs truncate ${currentView === user.usn ? 'text-white/70' : textSecondary}`}>
                                    {privateMessages[user.usn]?.length > 0
                                        ? privateMessages[user.usn][privateMessages[user.usn].length - 1].message
                                        : 'Start a conversation'}
                                </p>
                            </div>
                            {privateMessages[user.usn]?.length > 0 && currentView !== user.usn && (
                                <span className="w-2 h-2 bg-[#0071e3] rounded-full" />
                            )}
                        </button>
                    ))}

                    {onlineUsers.length === 0 && (
                        <div className={`px-4 py-8 text-center ${textSecondary}`}>
                            <p className="text-sm">No other users online</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className={`${bgSecondary} border-b ${borderColor} px-6 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${currentView === 'global'
                            ? 'bg-gradient-to-br from-green-400 to-green-600'
                            : 'bg-gradient-to-br from-purple-400 to-purple-600'
                            }`}>
                            {currentView === 'global'
                                ? <Users className="w-5 h-5" />
                                : getInitials(currentChatUser?.name || '')}
                        </div>
                        <div>
                            <p className={`font-semibold ${textPrimary}`}>
                                {currentView === 'global' ? 'Global Chat' : currentChatUser?.name || 'Unknown'}
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                                {currentView === 'global'
                                    ? `${onlineUsers.length + 1} participants`
                                    : 'Online'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className={`p-2 rounded-full hover:${bgTertiary}`}>
                            <Phone className={`w-5 h-5 ${textSecondary}`} />
                        </button>
                        <button className={`p-2 rounded-full hover:${bgTertiary}`}>
                            <Video className={`w-5 h-5 ${textSecondary}`} />
                        </button>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                            <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                {isConnected ? 'Connected' : 'Connecting'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className={`flex-1 overflow-y-auto p-6 ${bgPrimary}`}>
                    {currentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className={`w-16 h-16 rounded-full ${bgTertiary} flex items-center justify-center mb-4`}>
                                <MessageCircle className={`w-8 h-8 ${textSecondary}`} />
                            </div>
                            <p className={`font-medium ${textPrimary}`}>No messages yet</p>
                            <p className={`text-sm ${textSecondary} mt-1`}>
                                {currentView === 'global'
                                    ? 'Be the first to start a conversation!'
                                    : `Say hi to ${currentChatUser?.name}`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentMessages.map((msg, idx) => {
                                const isMe = msg.senderUsn === studentData.usn
                                const showAvatar = idx === 0 || currentMessages[idx - 1].senderUsn !== msg.senderUsn

                                return (
                                    <div
                                        key={idx}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                            {!isMe && showAvatar && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                                    {getInitials(msg.senderName)}
                                                </div>
                                            )}
                                            {!isMe && !showAvatar && <div className="w-8" />}

                                            <div>
                                                {!isMe && showAvatar && (
                                                    <p className={`text-xs ${textSecondary} mb-1 ml-1`}>{msg.senderName}</p>
                                                )}
                                                <div
                                                    className={`px-4 py-2 rounded-2xl ${isMe
                                                        ? 'bg-[#0071e3] text-white rounded-br-md'
                                                        : `${bgSecondary} ${textPrimary} rounded-bl-md border ${borderColor}`
                                                        }`}
                                                >
                                                    <p className="text-sm break-words">{msg.message}</p>
                                                </div>
                                                <p className={`text-xs ${textSecondary} mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Typing Indicators */}
                            {Array.from(typingUsers).filter(u => u !== studentData.usn).map(typingUsn => {
                                const typingUser = onlineUsers.find(u => u.usn === typingUsn)
                                return (
                                    <div key={typingUsn} className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                            {getInitials(typingUser?.name || '')}
                                        </div>
                                        <div className={`px-4 py-2 rounded-2xl rounded-bl-md ${bgSecondary} border ${borderColor}`}>
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className={`${bgSecondary} border-t ${borderColor} p-4`}>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className={`p-2 rounded-full hover:${bgTertiary}`}
                        >
                            <Smile className={`w-5 h-5 ${textSecondary}`} />
                        </button>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value)
                                handleTyping()
                            }}
                            placeholder={currentView === 'global' ? 'Message everyone...' : `Message ${currentChatUser?.name}...`}
                            className={`flex-1 ${bgTertiary} ${textPrimary} px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]`}
                            disabled={!isConnected}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || !isConnected}
                            className="w-10 h-10 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-all active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
