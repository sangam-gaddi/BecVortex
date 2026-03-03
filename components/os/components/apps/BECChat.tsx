"use client";
import { useState, useRef, useEffect } from 'react';

// ── Types ──
interface ChatMsg {
    _id: string; senderUsn: string; senderName: string; message: string;
    createdAt: string; type: 'global' | 'private';
    recipientUsn?: string; recipientName?: string;
}

// ── Main App ──
export function BECChat() {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [studentData, setStudentData] = useState<{ usn: string; studentName: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<'global' | 'private'>('global');
    const [privateTarget, setPrivateTarget] = useState<string>('');
    const [privateTargetName, setPrivateTargetName] = useState<string>('');
    const [onlineUsers, setOnlineUsers] = useState<{ usn: string; name: string }[]>([]);
    const [privateMessages, setPrivateMessages] = useState<ChatMsg[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const API_BASE = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : '';

    useEffect(() => { loadStudent(); }, []);
    useEffect(() => { if (studentData) { loadGlobalMessages(); loadOnlineUsers(); } }, [studentData]);
    useEffect(() => { if (privateTarget) loadPrivateMessages(privateTarget); }, [privateTarget]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, privateMessages]);

    // Auto-refresh messages rapidly (2 seconds)
    useEffect(() => {
        if (!studentData) return;
        const interval = setInterval(() => {
            loadGlobalMessages();
            if (privateTarget) loadPrivateMessages(privateTarget);
            loadOnlineUsers();
        }, 2000);
        return () => clearInterval(interval);
    }, [studentData, privateTarget]);

    // Keep online status alive
    useEffect(() => {
        if (!studentData) return;
        const pingOnline = async () => {
            try {
                await fetch(`${API_BASE}/api/chat/ping`, { method: 'POST', credentials: 'include' });
            } catch (err) { }
        };
        pingOnline(); // ping immediately
        const pingInterval = setInterval(pingOnline, 30000); // every 30s
        return () => clearInterval(pingInterval);
    }, [studentData]);

    const loadStudent = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStudentData({ usn: data.student?.usn, studentName: data.student?.studentName });
            }
        } catch (err) { console.error('Auth error:', err); }
        finally { setIsLoading(false); }
    };

    const loadGlobalMessages = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/global`, { credentials: 'include' });
            if (res.ok) { const data = await res.json(); setMessages(data.messages || []); }
        } catch (err) { console.error('Chat load error:', err); }
    };

    const loadPrivateMessages = async (targetUsn: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/private?recipientUsn=${targetUsn}`, { credentials: 'include' });
            if (res.ok) { const data = await res.json(); setPrivateMessages(data.messages || []); }
        } catch (err) { console.error('Private chat error:', err); }
    };

    const loadOnlineUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/online`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setOnlineUsers((data.users || []).map((u: any) => ({ usn: u.usn, name: u.studentName })));
            }
        } catch (err) { /* ignore */ }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !studentData) return;

        const endpoint = tab === 'global' ? '/api/chat/global' : '/api/chat/private';
        const body: any = { message: input };
        if (tab === 'private') body.recipientUsn = privateTarget;

        try {
            await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setInput('');
            if (tab === 'global') loadGlobalMessages();
            else loadPrivateMessages(privateTarget);
        } catch (err) { console.error('Send error:', err); }
    };

    const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const currentMsgs = tab === 'global' ? messages : privateMessages;

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#86868b] text-sm">Connecting...</p>
                </div>
            </div>
        );
    }

    if (!studentData) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center p-8">
                    <span className="text-4xl mb-4 block">🔐</span>
                    <p className="text-white font-medium">Login required</p>
                    <p className="text-[#86868b] text-sm mt-1">Please login via BEC Portal first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-[#1e1e1e] flex">
            {/* Sidebar */}
            <div className="w-64 bg-[#2d2d2d] border-r border-[#3d3d3d] flex flex-col">
                <div className="p-3 border-b border-[#3d3d3d]">
                    <h2 className="text-sm font-semibold text-white">Messages</h2>
                    <p className="text-xs text-[#86868b]">Logged in as {studentData.studentName}</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Global Chat */}
                    <button onClick={() => { setTab('global'); setPrivateTarget(''); }}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${tab === 'global' ? 'bg-[#0071e3] text-white' : 'hover:bg-[#3d3d3d] text-white'
                            }`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tab === 'global' ? 'bg-white/20' : 'bg-gradient-to-br from-green-400 to-green-600'}`}>
                            <span className="text-white text-sm">🌐</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium text-xs">Global Chat</p>
                            <p className={`text-xs truncate ${tab === 'global' ? 'text-white/70' : 'text-[#86868b]'}`}>
                                {messages.length > 0 ? messages[messages.length - 1].message : 'No messages'}
                            </p>
                        </div>
                    </button>

                    {/* Online Users Header */}
                    <div className="px-3 py-1.5 bg-[#3d3d3d]/50 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                            Online — {onlineUsers.length}
                        </p>
                    </div>

                    {/* Users */}
                    {onlineUsers.filter(u => u.usn !== studentData.usn).map(user => (
                        <button key={user.usn}
                            onClick={() => { setTab('private'); setPrivateTarget(user.usn); setPrivateTargetName(user.name); }}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${privateTarget === user.usn ? 'bg-[#0071e3] text-white' : 'hover:bg-[#3d3d3d] text-white'
                                }`}>
                            <div className="relative">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium ${privateTarget === user.usn ? 'bg-white/20' : 'bg-gradient-to-br from-purple-400 to-purple-600'}`}>
                                    {getInitials(user.name)}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2d2d2d]" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-xs">{user.name}</p>
                                <p className={`text-xs truncate ${privateTarget === user.usn ? 'text-white/70' : 'text-[#86868b]'}`}>
                                    Start a conversation
                                </p>
                            </div>
                        </button>
                    ))}

                    {onlineUsers.filter(u => u.usn !== studentData.usn).length === 0 && (
                        <div className="px-3 py-6 text-center text-[#86868b] text-xs">No other users online</div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-4 py-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm ${tab === 'global' ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-400 to-purple-600'
                            }`}>
                            {tab === 'global' ? '🌐' : getInitials(privateTargetName)}
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">
                                {tab === 'global' ? 'Global Chat' : privateTargetName}
                            </p>
                            <p className="text-xs text-[#86868b]">
                                {tab === 'global' ? `${onlineUsers.length + 1} participants` : 'Online'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-500">Connected</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    {currentMsgs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <span className="text-4xl mb-3">💬</span>
                            <p className="font-medium text-white text-sm">No messages yet</p>
                            <p className="text-xs text-[#86868b] mt-1">Be the first to start a conversation!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentMsgs.map((msg, idx) => {
                                const isMe = msg.senderUsn === studentData.usn;
                                const showAvatar = idx === 0 || currentMsgs[idx - 1].senderUsn !== msg.senderUsn;
                                return (
                                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                            {showAvatar && (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                                    {getInitials(msg.senderName)}
                                                </div>
                                            )}
                                            {!showAvatar && <div className="w-7" />}
                                            <div>
                                                {showAvatar && (
                                                    <p className={`text-xs text-[#86868b] mb-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                        {msg.senderName} ({isMe ? 'You' : msg.senderUsn})
                                                    </p>
                                                )}
                                                <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#0071e3] text-white rounded-br-md shadow-sm' : 'bg-[#2d2d2d] text-white rounded-bl-md border border-[#3d3d3d] shadow-sm'
                                                    }`}>
                                                    <p className="break-words">{msg.message}</p>
                                                </div>
                                                <p className={`text-xs text-[#86868b] mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                    {fmtTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="bg-[#2d2d2d] border-t border-[#3d3d3d] p-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <input type="text" value={input} onChange={e => setInput(e.target.value)}
                            placeholder={tab === 'global' ? 'Message everyone...' : `Message ${privateTargetName}...`}
                            className="flex-1 bg-[#3d3d3d] text-white px-4 py-2 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                        <button type="submit" disabled={!input.trim()}
                            className="w-9 h-9 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-all active:scale-95 text-sm">
                            ➤
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
