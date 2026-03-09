"use client"

import { useState, useRef, useEffect } from "react"
import { Folder, File, Trash2, MoreHorizontal, Plus } from "lucide-react"
import type { AppWindow } from "./types"

export interface DesktopItem {
    id: string
    name: string
    type: 'folder' | 'file' | 'shortcut'
    icon?: string // SVG path from icons folder
    position: { x: number; y: number }
    color?: string
}

interface DesktopIconsProps {
    isDarkMode: boolean
    onOpenApp?: (app: AppWindow) => void
}

const defaultDesktopItems: DesktopItem[] = [
    {
        id: 'documents',
        name: 'Documents',
        type: 'folder',
        icon: '/icons/file.svg',
        position: { x: 30, y: 50 },
        color: '#34c759'
    },
    {
        id: 'projects',
        name: 'Projects',
        type: 'folder',
        icon: '/icons/work.svg',
        position: { x: 30, y: 150 },
        color: '#0071e3'
    },
    {
        id: 'downloads',
        name: 'Downloads',
        type: 'folder',
        icon: '/icons/gicon2.svg',
        position: { x: 30, y: 250 },
        color: '#5856d6'
    },
    {
        id: 'trash',
        name: 'Trash',
        type: 'folder',
        icon: '/icons/trash.svg',
        position: { x: 30, y: 350 },
        color: '#86868b'
    },
]

export default function DesktopIcons({ isDarkMode, onOpenApp }: DesktopIconsProps) {
    const [items, setItems] = useState<DesktopItem[]>(defaultDesktopItems)
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<string | null>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId?: string } | null>(null)
    const [draggingItem, setDraggingItem] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    // Load items from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('desktopItems')
        if (saved) {
            try {
                setItems(JSON.parse(saved))
            } catch (e) {
                setItems(defaultDesktopItems)
            }
        }
    }, [])

    // Save items to localStorage
    useEffect(() => {
        localStorage.setItem('desktopItems', JSON.stringify(items))
    }, [items])

    // Handle clicks outside to deselect
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setSelectedItem(null)
                setContextMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingItem) {
                setItems(prev => prev.map(item =>
                    item.id === draggingItem
                        ? { ...item, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
                        : item
                ))
            }
        }

        const handleMouseUp = () => {
            setDraggingItem(null)
        }

        if (draggingItem) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [draggingItem, dragOffset])

    const handleContextMenu = (e: React.MouseEvent, itemId?: string) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, itemId })
        if (itemId) setSelectedItem(itemId)
    }

    const handleDoubleClick = (item: DesktopItem) => {
        if (item.type === 'folder' && onOpenApp) {
            onOpenApp({
                id: `folder-${item.id}`,
                title: item.name,
                component: 'Folder',
                position: { x: 200, y: 100 },
                size: { width: 600, height: 400 }
            })
        }
    }

    const handleMouseDown = (e: React.MouseEvent, item: DesktopItem) => {
        setSelectedItem(item.id)
        setDraggingItem(item.id)
        setDragOffset({
            x: e.clientX - item.position.x,
            y: e.clientY - item.position.y
        })
    }

    const createNewFolder = () => {
        const newId = `folder-${Date.now()}`
        const newFolder: DesktopItem = {
            id: newId,
            name: 'New Folder',
            type: 'folder',
            icon: '/icons/file.svg',
            position: contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 130, y: 50 },
            color: '#0071e3'
        }
        setItems(prev => [...prev, newFolder])
        setContextMenu(null)
        setEditingItem(newId)
    }

    const deleteItem = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId))
        setContextMenu(null)
    }

    const renameItem = (itemId: string, newName: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, name: newName } : item
        ))
        setEditingItem(null)
    }

    const textClass = isDarkMode ? 'text-white' : 'text-white'
    const menuBgClass = isDarkMode ? 'bg-[#2d2d2d]/95' : 'bg-white/95'
    const menuTextClass = isDarkMode ? 'text-white' : 'text-gray-800'
    const menuHoverClass = isDarkMode ? 'hover:bg-[#0071e3]' : 'hover:bg-[#0071e3] hover:text-white'

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 pt-8 pb-20"
            onContextMenu={(e) => handleContextMenu(e)}
            onClick={() => { setSelectedItem(null); setContextMenu(null); }}
        >
            {/* Desktop Items */}
            {items.map(item => (
                <div
                    key={item.id}
                    className={`absolute flex flex-col items-center w-20 cursor-pointer select-none group`}
                    style={{ left: item.position.x, top: item.position.y }}
                    onClick={(e) => {
                        e.stopPropagation()
                        setSelectedItem(item.id)
                    }}
                    onDoubleClick={() => handleDoubleClick(item)}
                    onMouseDown={(e) => handleMouseDown(e, item)}
                    onContextMenu={(e) => handleContextMenu(e, item.id)}
                >
                    {/* Icon Container */}
                    <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${selectedItem === item.id
                            ? 'bg-white/30 ring-2 ring-white/50'
                            : 'group-hover:bg-white/10'
                            }`}
                        style={{
                            backgroundColor: selectedItem === item.id ? `${item.color}40` : undefined
                        }}
                    >
                        {item.icon ? (
                            <img
                                src={item.icon}
                                alt={item.name}
                                className="w-10 h-10"
                                style={{ filter: isDarkMode ? 'invert(1)' : 'none' }}
                                draggable={false}
                            />
                        ) : (
                            <Folder className="w-10 h-10" style={{ color: item.color || '#0071e3' }} />
                        )}
                    </div>

                    {/* Name */}
                    {editingItem === item.id ? (
                        <input
                            type="text"
                            defaultValue={item.name}
                            className={`mt-1 w-full text-center text-xs font-medium px-1 py-0.5 rounded bg-white/20 ${textClass} focus:outline-none focus:ring-1 focus:ring-white/50`}
                            autoFocus
                            onBlur={(e) => renameItem(item.id, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') renameItem(item.id, e.currentTarget.value)
                                if (e.key === 'Escape') setEditingItem(null)
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className={`mt-1 text-xs font-medium text-center px-1 py-0.5 rounded ${textClass} ${selectedItem === item.id ? 'bg-[#0071e3]' : ''
                                }`}
                            style={{
                                textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.5)',
                                maxWidth: '76px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {item.name}
                        </span>
                    )}
                </div>
            ))}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className={`fixed ${menuBgClass} backdrop-blur-xl rounded-lg shadow-2xl py-1 min-w-[180px] z-50 pointer-events-auto border border-white/10`}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.itemId ? (
                        // Item context menu
                        <>
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm ${menuTextClass} ${menuHoverClass}`}
                                onClick={() => handleDoubleClick(items.find(i => i.id === contextMenu.itemId)!)}
                            >
                                Open
                            </button>
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm ${menuTextClass} ${menuHoverClass}`}
                                onClick={() => { setEditingItem(contextMenu.itemId!); setContextMenu(null) }}
                            >
                                Rename
                            </button>
                            <div className="border-t border-gray-600/30 my-1" />
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-red-500 hover:text-white`}
                                onClick={() => deleteItem(contextMenu.itemId!)}
                            >
                                Move to Trash
                            </button>
                        </>
                    ) : (
                        // Desktop context menu
                        <>
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm ${menuTextClass} ${menuHoverClass} flex items-center gap-2`}
                                onClick={createNewFolder}
                            >
                                <Plus className="w-4 h-4" /> New Folder
                            </button>
                            <div className="border-t border-gray-600/30 my-1" />
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm ${menuTextClass} ${menuHoverClass}`}
                                onClick={() => setContextMenu(null)}
                            >
                                Change Wallpaper
                            </button>
                            <button
                                className={`w-full text-left px-4 py-1.5 text-sm ${menuTextClass} ${menuHoverClass}`}
                                onClick={() => setContextMenu(null)}
                            >
                                Sort By Name
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
