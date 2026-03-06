"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppTemplate } from './AppTemplate';
import { getHierarchyDirectory, searchUserByUSN, createGroup, sendMessage, getUserGroups, getChatHistory, getMyProfile, getUnreadCounts, markMessagesAsRead } from '@/lib/actions/chat.actions';
import { io, Socket } from 'socket.io-client';
import { Search, Plus, Hash, Send, Users, ChevronDown, ChevronRight, MessageSquare, Shield, Info, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export function BECChat() {
    // ── Session & Permissions ──
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [canCreateGroup, setCanCreateGroup] = useState(false);

    // ── Layour Data ──
    const [directory, setDirectory] = useState<any>({});
    const [groups, setGroups] = useState<any[]>([]);

    // ── Active Chat State ──
    // chatType can be: 'global', 'private', 'group'
    const [chatType, setChatType] = useState<'global' | 'private' | 'group'>('global');
    const [activeTarget, setActiveTarget] = useState<any>(null); // user obj or group obj

    // ── Messaging State ──
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // ── Search State ──
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // ── Group Creation Modal ──
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [bulkUsns, setBulkUsns] = useState('');

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<any[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [unreadList, setUnreadList] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    // lastMessages: keyed by 'global' | `private_${id}` | `group_${id}` -> last message preview
    const [lastMessages, setLastMessages] = useState<Record<string, { text: string; time: string }>>({});

    // On Load
    useEffect(() => {
        loadInitialData();
        // Polling as fallback for when socket is disconnected
        const interval = setInterval(() => {
            refreshMessages();
            refreshUnread();
        }, 15000);

        return () => {
            clearInterval(interval);
            if (socket) socket.disconnect();
        };
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        setMessages([]); // clear on switch
        refreshMessages();
    }, [chatType, activeTarget]);

    // Realtime append via socket to avoid flicker when polling is empty or delayed
    useEffect(() => {
        if (!socket) return;

        const normalizeMsg = (msg: any) => ({ ...msg, content: msg.content || msg.message });

        const handleGlobal = (msg: any) => {
            const normalized = normalizeMsg(msg);
            setLastMessages(prev => ({ ...prev, global: { text: normalized.content, time: normalized.timestamp || new Date().toISOString() } }));
            if (chatType !== 'global') return;
            setMessages(prev => [...prev, normalized]);
        };

        const handlePrivate = (msg: any) => {
            const normalized = normalizeMsg(msg);
            const myId = (currentUser?.usn || currentUser?._id)?.toString();
            const partnerUsn = msg.senderUsn === myId ? msg.recipientUsn : msg.senderUsn;
            setLastMessages(prev => ({
                ...prev,
                [`private_${partnerUsn}`]: { text: normalized.content, time: normalized.timestamp || new Date().toISOString() },
            }));
            if (chatType !== 'private' || !activeTarget) return;
            const targetKey = (activeTarget.usn || activeTarget.email || activeTarget._id)?.toString();
            if (partnerUsn === targetKey) {
                setMessages(prev => {
                    // Deduplicate — sender already has it via optimistic update
                    if (prev.some(m => m._id?.toString() === normalized._id?.toString())) return prev;
                    return [...prev, normalized];
                });
            }
        };

        const handleGroup = (msg: any) => {
            const normalized = normalizeMsg(msg);
            const gId = (msg.groupId?._id || msg.groupId)?.toString();
            setLastMessages(prev => ({
                ...prev,
                [`group_${gId}`]: { text: normalized.content, time: normalized.timestamp || new Date().toISOString() },
            }));
            if (chatType !== 'group' || !activeTarget) return;
            if (gId === activeTarget._id?.toString()) {
                setMessages(prev => {
                    // Deduplicate — the sender already has it via optimistic update
                    if (prev.some(m => m._id?.toString() === normalized._id?.toString())) return prev;
                    return [...prev, normalized];
                });
            }
        };

        const handleGroupCreated = () => {
            getUserGroups().then(res => { if (res.success) setGroups(res.groups); });
        };

        socket.on('new-global-message', handleGlobal);
        socket.on('new-private-message', handlePrivate);
        socket.on('new-group-message', handleGroup);
        socket.on('group-created', handleGroupCreated);

        return () => {
            socket.off('new-global-message', handleGlobal);
            socket.off('new-private-message', handlePrivate);
            socket.off('new-group-message', handleGroup);
            socket.off('group-created', handleGroupCreated);
        };
    }, [socket, chatType, activeTarget, currentUser]);

    const loadInitialData = async () => {
        try {
            const [dirRes, groupsRes, profileRes, unreadRes] = await Promise.all([
                getHierarchyDirectory(),
                getUserGroups(),
                getMyProfile(),
                getUnreadCounts()
            ]);

            if (dirRes.success) setDirectory(dirRes.directory);
            if (groupsRes.success) {
                setGroups(groupsRes.groups);
                setCanCreateGroup(true);
            }
            if (unreadRes.success) {
                setUnreadList(unreadRes.unread ?? []);
            }

            // Socket presence initialization
            if (profileRes.success && profileRes.profile) {
                setCurrentUser(profileRes.profile);
                const newSocket = io(process.env.NEXT_PUBLIC_APP_URL || '', { path: '/api/socket' });
                newSocket.emit('join', {
                    usn: profileRes.profile.usn || profileRes.profile._id,
                    name: profileRes.profile.fullName
                });

                newSocket.on('online-users', (users: string[]) => {
                    setOnlineUsers(users);
                });

                // Explicitly join all group rooms on the client side too (belt-and-suspenders)
                if (groupsRes.success && groupsRes.groups?.length > 0) {
                    groupsRes.groups.forEach((g: any) => {
                        newSocket.emit('join-group', { groupId: String(g._id) });
                    });
                }

                setSocket(newSocket);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const refreshUnread = async () => {
        const res = await getUnreadCounts();
        if (res.success) setUnreadList(res.unread ?? []);
    };

    const setPrivateChat = async (user: any) => {
        setChatType('private');
        setActiveTarget(user);

        // Optimistically clear their unread badge
        setUnreadList(prev => prev.filter(u => u.senderId !== String(user._id)));
        await markMessagesAsRead(user._id);
    };

    const refreshMessages = async () => {
        let query: any = {};
        if (chatType === 'global') {
            query.isGlobal = true;
        } else if (chatType === 'private' && activeTarget) {
            query.receiverId = activeTarget._id;
        } else if (chatType === 'group' && activeTarget) {
            query.groupId = activeTarget._id;
        } else {
            return;
        }

        const res = await getChatHistory(query);
        if (res.success) {
            const normalized = (res.messages || []).map((m: any) => ({ ...m, content: m.content || (m as any).message }));
            if (normalized.length === 0 && messagesRef.current.length > 0) return;
            setMessages(normalized);
            // Update last message preview for this conversation
            if (normalized.length > 0) {
                const last = normalized[normalized.length - 1];
                const previewKey = chatType === 'global' ? 'global'
                    : chatType === 'group' ? `group_${activeTarget?._id}`
                    : `private_${activeTarget?.usn || activeTarget?.email || activeTarget?._id}`;
                setLastMessages(prev => ({ ...prev, [previewKey]: { text: last.content, time: last.createdAt } }));
            }
        }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([refreshMessages(), refreshUnread(),
            getUserGroups().then(r => { if (r.success) setGroups(r.groups); })
        ]);
        setIsRefreshing(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        setIsSending(true);
        let payload: any = { content: inputText, isGlobal: chatType === 'global' };

        if (chatType === 'private') {
            payload.receiverId = activeTarget._id;
        } else if (chatType === 'group') {
            payload.groupId = activeTarget._id;
        }

        const res = await sendMessage(payload);
        if (res.success) {
            setInputText('');
            // Optimistic local update
            setMessages(prev => [...prev, res.message]);
            // Real-time broadcast to all other connected clients
            if (socket) {
                // Enrich the message with senderUsn/recipientUsn so handlePrivate
                // on the receiver's side can route it to the correct conversation.
                const enriched = {
                    ...res.message,
                    senderUsn: currentUser?.usn || currentUser?.email || String(currentUser?._id),
                    senderName: currentUser?.fullName,
                    recipientUsn: chatType === 'private'
                        ? (activeTarget?.usn || activeTarget?.email)
                        : undefined,
                };
                socket.emit('broadcast-message', {
                    type: chatType,
                    message: enriched,
                    recipientUsn: enriched.recipientUsn,
                    groupId: chatType === 'group'
                        ? String(activeTarget?._id)
                        : undefined,
                });
            }
        } else {
            toast.error(res.error || 'Failed to send');
        }
        setIsSending(false);
    };

    const handleSearchUSN = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        const res = await searchUserByUSN(searchQuery);
        setIsSearching(false);

        if (res.success) {
            setPrivateChat(res.user);
            setSearchQuery('');
        } else {
            toast.error(res.error || 'No student found with that USN.');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return toast.error('Group name required');

        setIsCreatingGroup(true);
        const usnArray = bulkUsns.split(',').map(u => u.trim()).filter(Boolean);
        const res = await createGroup(newGroupName, selectedMembers, undefined, usnArray);
        setIsCreatingGroup(false);

        if (res.success) {
            toast.success('Group Created!');
            setIsGroupModalOpen(false);
            setNewGroupName('');
            setSelectedMembers([]);
            setBulkUsns('');

            // Refresh groups
            const groupsRes = await getUserGroups();
            if (groupsRes.success) setGroups(groupsRes.groups);

            // Notify other clients to refresh their groups list
            if (socket) {
                socket.emit('group-created', { groupId: res.group._id });
            }

            setChatType('group');
            setActiveTarget(res.group);
        } else {
            toast.error(res.error);
        }
    };

    const toggleMemberSelection = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    // ── UI Helpers ──
    const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const fmtPreview = (text: string) => text ? (text.length > 28 ? text.slice(0, 28) + '…' : text) : '';
    const myId = currentUser?._id?.toString();

    const HierarchyDrawer = ({ title, users, icon: Icon, color }: { title: string, users: any[], icon: any, color: string }) => {
        const [open, setOpen] = useState(false);
        if (!users || users.length === 0) return null;

        return (
            <div className="mb-2">
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-colors border border-white/5"
                >
                    <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-semibold text-white/90">{title}</span>
                    </div>
                    {open ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
                </button>
                {open && (
                    <div className="mt-1 ml-2 border-l-2 border-white/10 pl-2 space-y-1">
                        {users.map(u => {
                            const isOnline = onlineUsers.includes(u.email || u.usn || u._id);
                            const unreadItem = unreadList.find(unread => unread.senderId === String(u._id));
                            const badgeCount = unreadItem ? unreadItem.count : 0;

                            return (
                                <button
                                    key={u._id}
                                    onClick={() => setPrivateChat(u)}
                                    className={`w-full flex items-center justify-between p-1.5 rounded-md text-xs transition-colors group ${chatType === 'private' && activeTarget?._id === u._id
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'hover:bg-white/5 text-white/70'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                        <div className="relative">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-[9px] font-bold text-blue-300">
                                                {getInitials(u.fullName)}
                                            </div>
                                            {isOnline && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-[#2d2d2d]" />
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden min-w-0">
                                            <div className="font-medium truncate">{u.fullName}</div>
                                            {u.department && <div className="text-[9px] opacity-60 truncate">{u.department}</div>}
                                        </div>
                                    </div>
                                    {badgeCount > 0 && (
                                        <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 shadow-lg shadow-red-500/20">
                                            {badgeCount}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="w-full h-full bg-[#1e1e1e] flex overflow-hidden">

                    {/* LEFT COLUMN: Hierarchy Directory */}
                    <div className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col shrink-0">
                        <div className="p-4 border-b border-[#333]">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-400" /> Directory
                            </h2>
                            <p className="text-xs text-white/50 mt-1 leading-tight">College Hierarchy</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 p-2">
                            <HierarchyDrawer title="Principal" users={directory.PRINCIPAL} icon={Shield} color="text-yellow-400" />
                            <HierarchyDrawer title="HODs" users={directory.HOD} icon={Users} color="text-red-400" />
                            <HierarchyDrawer title="Officers" users={directory.OFFICER} icon={Shield} color="text-emerald-400" />
                            <HierarchyDrawer title="Faculty" users={directory.FACULTY} icon={Users} color="text-blue-400" />

                            {/* Unread Custom Direct Messages from Students/Others */}
                            {unreadList.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-[#333]">
                                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1 mb-2">
                                        Unread Direct Messages
                                    </div>
                                    {unreadList.map((unreadItem: any) => {
                                        const isOnline = onlineUsers.includes(unreadItem.profile.usn || unreadItem.profile.email || unreadItem.profile._id);
                                        return (
                                            <button
                                                key={unreadItem.senderId}
                                                onClick={() => setPrivateChat(unreadItem.profile)}
                                                className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group mb-1"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                    <div className="relative">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-300 shadow-lg shadow-blue-500/10">
                                                            {getInitials(unreadItem.profile.fullName)}
                                                        </div>
                                                        {isOnline && (
                                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]" />
                                                        )}
                                                    </div>
                                                    <div className="text-left overflow-hidden min-w-0">
                                                        <div className="text-sm font-medium text-white/90 truncate">{unreadItem.profile.fullName}</div>
                                                        <div className="text-[10px] text-white/50 truncate font-mono mt-0.5">{unreadItem.profile.role === 'STUDENT' ? unreadItem.profile.usn : unreadItem.profile.department}</div>
                                                    </div>
                                                </div>
                                                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-lg shadow-red-500/20">
                                                    {unreadItem.count}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CENTER COLUMN: Main Chat Engine */}
                    <div className="flex-1 bg-[#121212] flex flex-col min-w-[300px]">
                        {/* Top Bar */}
                        <div className="h-16 bg-[#1a1a1a] border-b border-[#333] px-4 py-2 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                {chatType === 'global' && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                                            <span className="text-white text-lg">🌐</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">Global Channel</h3>
                                            <p className="text-xs text-green-400 font-mono">Auto-deletes in 1 min</p>
                                        </div>
                                    </div>
                                )}
                                {chatType === 'private' && activeTarget && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
                                            {getInitials(activeTarget.fullName)}
                                        </div>
                                        <div className="overflow-hidden min-w-0">
                                            <h3 className="font-bold text-white leading-tight truncate">{activeTarget.fullName}</h3>
                                            <p className="text-xs text-blue-400 truncate">{activeTarget.role || 'Student'} {activeTarget.department ? `· ${activeTarget.department}` : ''}</p>
                                        </div>
                                    </div>
                                )}
                                {chatType === 'group' && activeTarget && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20 shrink-0">
                                            <Hash className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden min-w-0">
                                            <h3 className="font-bold text-white leading-tight truncate">{activeTarget.name}</h3>
                                            <p className="text-xs text-purple-400 font-mono truncate">{activeTarget.members?.length || 0} members · {activeTarget.department || 'General'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Refresh Button */}
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={isRefreshing}
                                    title="Refresh"
                                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all disabled:opacity-40"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>

                                {/* Search Student via USN */}
                                <form onSubmit={handleSearchUSN} className="w-56 relative group">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search USN…"
                                        className="w-full bg-[#252525] border border-[#333] text-white text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:bg-[#303030] transition-all font-mono"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {isSearching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />}
                                </form>
                            </div>
                        </div>

                        {/* Message Feed */}
                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1 bg-[#0e0e0e]">
                            <div className="flex justify-center mb-5">
                                <div className="bg-white/5 border border-white/10 text-white/40 text-[10px] px-4 py-1.5 rounded-full flex items-center gap-2 tracking-wide">
                                    <Info className="w-3 h-3" />
                                    End-to-end encrypted · Auto-deletion enforced
                                </div>
                            </div>

                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20">
                                    <MessageSquare className="w-14 h-14 mb-3 opacity-20" />
                                    <p className="text-sm">No messages yet</p>
                                    <p className="text-xs mt-1 opacity-60">Be the first to say something</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
                                    const isMe = senderId === myId;
                                    const senderName = msg.senderId?.fullName || msg.senderName || 'Unknown';
                                    const prevMsg = messages[idx - 1];
                                    const prevSenderId = prevMsg?.senderId?._id?.toString() || prevMsg?.senderId?.toString();
                                    const isGrouped = prevSenderId === senderId;

                                    return (
                                        <div
                                            key={msg._id || idx}
                                            className={`flex items-end gap-2.5 ${
                                                isMe ? 'flex-row-reverse' : 'flex-row'
                                            } ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
                                        >
                                            {/* Avatar — only show on first of a group */}
                                            <div className={`w-8 h-8 shrink-0 ${
                                                isGrouped ? 'opacity-0' : ''
                                            }`}>
                                                {!isGrouped && (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                        isMe
                                                            ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/20'
                                                            : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white/80 border border-white/10'
                                                    }`}>
                                                        {getInitials(senderName)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bubble + meta */}
                                            <div className={`flex flex-col max-w-[65%] ${ isMe ? 'items-end' : 'items-start' }`}>
                                                {!isGrouped && (
                                                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${ isMe ? 'flex-row-reverse' : '' }`}>
                                                        <span className={`text-[11px] font-semibold ${ isMe ? 'text-violet-300' : 'text-blue-300' }`}>
                                                            {isMe ? 'You' : senderName}
                                                        </span>
                                                        <span className="text-[10px] text-white/25">{fmtTime(msg.createdAt || msg.timestamp)}</span>
                                                    </div>
                                                )}
                                                <div className={`px-4 py-2.5 text-[13px] leading-relaxed break-words shadow-lg ${
                                                    isMe
                                                        ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white rounded-2xl rounded-br-sm shadow-blue-900/30'
                                                        : 'bg-[#2a2a2f] text-white/90 border border-white/8 rounded-2xl rounded-bl-sm'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                {isGrouped && (
                                                    <div className="text-[9px] text-white/20 px-1 mt-0.5">{fmtTime(msg.createdAt || msg.timestamp)}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-[#141414] border-t border-white/8 p-4 shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    placeholder={chatType === 'global' ? '⚡ Global — deletes in 1 min…' : chatType === 'group' ? `Message #${activeTarget?.name || 'group'}…` : `Message ${activeTarget?.fullName || '…'}`}
                                    className="flex-1 bg-[#1e1e24] border border-white/10 text-white text-sm rounded-2xl px-5 py-3 focus:outline-none focus:border-violet-500/50 focus:bg-[#24242c] transition-all placeholder:text-white/25"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isSending}
                                    className="w-11 h-11 bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-all shadow-lg shadow-blue-900/30 active:scale-95 shrink-0"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Group Hub */}
                    <div className="w-64 bg-[#1a1a1a] border-l border-[#333] flex flex-col shrink-0">
                        <div className="p-4 border-b border-[#333] flex items-center justify-between">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Hash className="w-5 h-5 text-purple-400" /> Channels
                            </h2>
                            {canCreateGroup && (
                                <button
                                    onClick={() => setIsGroupModalOpen(true)}
                                    className="w-7 h-7 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg flex items-center justify-center transition-colors"
                                    title="Create Group"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <button
                                onClick={() => { setChatType('global'); setActiveTarget(null); }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border ${
                                    chatType === 'global' ? 'bg-green-500/10 border-green-500/30' : 'bg-[#1e1e1e] hover:bg-[#252525] border-white/5'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-green-400 text-base font-bold">🌐</span>
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="font-semibold text-sm text-green-100 truncate">Global Channel</div>
                                    {lastMessages['global'] ? (
                                        <div className="text-[10px] text-white/35 truncate mt-0.5">{fmtPreview(lastMessages['global'].text)}</div>
                                    ) : (
                                        <div className="text-[10px] text-white/25 truncate mt-0.5">Auto-deletes in 1 min</div>
                                    )}
                                </div>
                            </button>

                            <div className="pt-4 pb-2 text-xs font-bold text-white/40 uppercase tracking-widest pl-1">
                                My Groups
                            </div>

                            {groups.map(group => {
                                const previewKey = `group_${group._id}`;
                                const preview = lastMessages[previewKey];
                                return (
                                    <button
                                        key={group._id}
                                        onClick={() => { setChatType('group'); setActiveTarget(group); }}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border ${
                                            chatType === 'group' && activeTarget?._id === group._id
                                                ? 'bg-purple-500/10 border-purple-500/30'
                                                : 'bg-[#1e1e1e] hover:bg-[#252525] border-white/5'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                            <Hash className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="font-semibold text-sm text-purple-50 truncate">{group.name}</div>
                                            <div className="text-[10px] text-white/35 truncate mt-0.5">
                                                {preview ? fmtPreview(preview.text) : (group.department || 'General')}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {groups.length === 0 && (
                                <p className="text-center text-xs text-white/30 pt-4">You are not in any groups.</p>
                            )}
                        </div>
                    </div>

                    {/* CREATE GROUP MODAL OVERLAY */}
                    {isGroupModalOpen && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
                                <div className="p-5 border-b border-white/10">
                                    <h2 className="text-xl font-bold text-white">Create New Channel</h2>
                                    <p className="text-xs text-white/50 mt-1">Select staff from hierarchy to add to your group.</p>
                                </div>
                                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Group Name</label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={e => setNewGroupName(e.target.value)}
                                            placeholder="e.g. CS Dept Heads"
                                            className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Bulk Add Students (USNs)</label>
                                        <textarea
                                            value={bulkUsns}
                                            onChange={e => setBulkUsns(e.target.value)}
                                            placeholder="Enter USNs separated by commas (e.g. 2BA21CS001, 2BA21CS002)"
                                            className="w-full bg-[#121212] border border-[#333] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all font-mono min-h-[70px] max-h-[150px] resize-y"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Select Staff</label>
                                        <div className="bg-[#121212] border border-[#333] rounded-xl max-h-48 overflow-y-auto p-2">
                                            {/* We simply list all staff flatly for the checkbox selection */}
                                            {Object.keys(directory).map(role => (
                                                <div key={role} className="mb-2">
                                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2 mb-1">{role}</div>
                                                    {directory[role].map((u: any) => (
                                                        <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMembers.includes(u._id)}
                                                                onChange={() => toggleMemberSelection(u._id)}
                                                                className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                                                            />
                                                            <div className="flex-1 truncate">
                                                                <div className="text-sm font-medium text-white/90 truncate">{u.fullName}</div>
                                                                <div className="text-[10px] text-white/40 truncate">{u.department}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 border-t border-white/10 flex gap-3">
                                    <button
                                        onClick={() => setIsGroupModalOpen(false)}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={isCreatingGroup || !newGroupName.trim()}
                                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-purple-600 text-white rounded-xl text-sm font-semibold transition-colors flex justify-center items-center"
                                    >
                                        {isCreatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Hub'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
        />
    );
}

export default BECChat;
