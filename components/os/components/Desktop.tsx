"use client";
import React, { useState, useEffect, memo, useRef, forwardRef, useCallback } from 'react';
import { useAppContext } from '@/components/os/components/AppContext';

export interface DesktopIcon {
  id: string;
  name: string;
  type: 'folder' | 'file';
  position: { x: number; y: number };
  isEmpty?: boolean;
}
// import { lightenColor } from '@/components/os/utils/colors';
import { FileIcon } from '@/components/os/components/ui/FileIcon';
import { useFileSystem } from '@/components/os/components/FileSystemContext';
import { ContextMenuItem as ContextMenuItemType } from '@/components/os/types';
import { useI18n } from '@/components/os/i18n';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/os/components/ui/context-menu';
import { renderContextMenuItems } from '@/components/os/components/ui/context-menu-utils';
// import { checkPermissions } from '@/components/os/utils/fileSystemUtils';
import { FolderOpen, Trash2, Clipboard, Image as ImageIcon, Scissors, Copy, Info } from 'lucide-react';
import { notify } from '@/components/os/services/notifications';
import { getAllApps, type AppMetadata } from '@/components/os/config/appRegistry';
import { BRAND } from '@/components/os/config/systemConfig';

// Build wallpaper map from single source of truth (systemConfig)
const WALLPAPERS: Record<string, string> = Object.fromEntries(
  BRAND.wallpapers.map(wp => [wp.id, wp.src])
);

const ROLE_LABELS: Record<string, string> = {
  MASTER: '🛡️ Master Admin Apps',
  PRINCIPAL: '🏛️ Principal Apps',
  HOD: '📋 HOD Apps',
  OFFICER: '⚙️ Officer Apps',
  FACULTY: '👨‍🏫 Faculty Apps',
  STUDENT: '🎓 Student Apps',
};

// BEC-specific app IDs (non-generic OS apps)
const BEC_APP_IDS = new Set([
  'bec-pay', 'bec-chat', 'bec-portal',
  'account-manager', 'admit-app',
  'subject-directory', 'subject-assigner', 're-registration',
  'course-registration', 'hall-ticket-generation', 'hall-ticket',
  'teaching-assigner', 'faculty-dashboard', 'marks-upload', 'attendance-upload', 'cr-assigner',
]);

// Map of role -> which BEC app IDs belong to that role
const ROLE_APP_MAP: { role: string; label: string; color: string; apps: string[] }[] = [
  { role: 'HOD', label: '📋 HOD', color: 'text-violet-400', apps: ['account-manager', 'teaching-assigner'] },
  { role: 'OFFICER', label: '⚙️ Officer', color: 'text-sky-400', apps: ['admit-app', 'subject-directory', 'subject-assigner', 're-registration', 'fees-checker', 'edit-fee', 'hall-ticket-generation'] },
  { role: 'FACULTY', label: '👨‍🏫 Faculty', color: 'text-emerald-400', apps: ['faculty-dashboard', 'marks-upload', 'attendance-upload', 'cr-assigner'] },
  { role: 'STUDENT', label: '🎓 Student', color: 'text-indigo-400', apps: ['bec-portal', 'course-registration', 'bec-pay', 'fee-check', 'download-receipts', 'hall-ticket'] },
];

// ── BEC Vortex draggable app icons on the desktop ───────────────────────────
const ICON_W = 68;   // icon + label column width
const ICON_H = 82;   // total height per icon (icon + label)
const ICON_GAP = 12; // vertical gap

function BECVortexDesktopIcons({ onOpenApp }: { onOpenApp: (type: string) => void }) {
  const allApps = getAllApps();
  const appMap = new Map(allApps.map(a => [a.id, a]));
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<{
    id: string; startMx: number; startMy: number; startIx: number; startIy: number;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const getStorageKey = useCallback(
    (role: string) => `bec-vortex-icons-${role}-${isMobileView ? 'mobile' : 'desktop'}`,
    [isMobileView]
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const updateViewport = () => setIsMobileView(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [mounted]);

  // Detect current user role from sessionStorage
  useEffect(() => {
    if (!mounted) return;
    const detect = () => {
      const role = sessionStorage.getItem('bec-vortex-role');
      const userType = sessionStorage.getItem('bec-vortex-userType');
      const effectiveRole = role || (userType === 'student' ? 'STUDENT' : null);
      setCurrentRole(prev => {
        if (prev !== effectiveRole) {
          // Role changed: reset positions so new role gets fresh layout
          if (effectiveRole) {
            localStorage.removeItem(`bec-vortex-icons-${effectiveRole}-desktop`);
            localStorage.removeItem(`bec-vortex-icons-${effectiveRole}-mobile`);
          }
        }
        return effectiveRole;
      });
    };
    detect();
    const t1 = setTimeout(detect, 800);
    const t2 = setTimeout(detect, 2000);
    window.addEventListener('storage', detect);
    return () => { window.removeEventListener('storage', detect); clearTimeout(t1); clearTimeout(t2); };
  }, [mounted]);

  // Get apps for current role
  const myGroup = ROLE_APP_MAP.find(g => g.role === currentRole);
  const myAppIds = myGroup?.apps || [];
  const myApps = myAppIds.map(id => appMap.get(id)).filter(Boolean) as AppMetadata[];

  // Initialise positions on right side (one column)
  useEffect(() => {
    if (!mounted || myApps.length === 0 || !currentRole) return;
    const storageKey = getStorageKey(currentRole);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use saved if it has entries for current apps
        if (myApps.every(a => parsed[a.id])) { setPositions(parsed); return; }
      } catch { /* ignore */ }
    }
    const winW = window.innerWidth;
    const startX = isMobileView ? Math.max(12, winW - ICON_W - 24) : 24;
    const startY = 60;
    const pos: Record<string, { x: number; y: number }> = {};
    myApps.forEach((app, i) => {
      pos[app.id] = { x: startX, y: startY + i * (ICON_H + ICON_GAP) };
    });
    setPositions(pos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, myApps.length, currentRole, isMobileView, getStorageKey]);

  const savePos = (pos: Record<string, { x: number; y: number }>) => {
    setPositions(pos);
    if (currentRole) localStorage.setItem(getStorageKey(currentRole), JSON.stringify(pos));
  };

  const handlePointerDown = (e: React.PointerEvent, appId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = positions[appId] || { x: 0, y: 0 };
    setSelected(appId);
    setDragState({ id: appId, startMx: e.clientX, startMy: e.clientY, startIx: pos.x, startIy: pos.y });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, appId: string) => {
    if (!dragState || dragState.id !== appId) return;
    const newX = dragState.startIx + (e.clientX - dragState.startMx);
    const newY = dragState.startIy + (e.clientY - dragState.startMy);
    setPositions(prev => ({ ...prev, [appId]: { x: newX, y: newY } }));
  };

  const handlePointerUp = (e: React.PointerEvent, appId: string) => {
    if (!dragState || dragState.id !== appId) return;
    const moved = Math.abs(e.clientX - dragState.startMx) > 4 || Math.abs(e.clientY - dragState.startMy) > 4;
    if (!moved) {
      // Single click: just select
    }
    savePos({ ...positions, [appId]: positions[appId] || { x: 0, y: 0 } });
    setDragState(null);
  };

  const clickTimerRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleClick = (appId: string) => {
    // Detect double-click manually
    if (clickTimerRef.current[appId]) {
      clearTimeout(clickTimerRef.current[appId]);
      delete clickTimerRef.current[appId];
      onOpenApp(appId);
    } else {
      clickTimerRef.current[appId] = setTimeout(() => { delete clickTimerRef.current[appId]; }, 350);
    }
  };

  if (!mounted || myApps.length === 0) return null;

  return (
    <>
      {myApps.map((app) => {
        const pos = positions[app.id];
        if (!pos) return null;
        const isDragging = dragState?.id === app.id;
        const isSelected = selected === app.id;

        return (
          <div
            key={app.id}
            className={`absolute z-10 flex flex-col items-center gap-1.5 cursor-pointer select-none`}
            style={{
              left: pos.x,
              top: pos.y,
              width: ICON_W,
              touchAction: 'none',
              userSelect: 'none',
              transform: isDragging ? 'scale(1.12)' : 'scale(1)',
              transition: isDragging ? 'none' : 'transform 0.12s ease',
              filter: isDragging ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' : undefined,
            }}
            onPointerDown={(e) => handlePointerDown(e, app.id)}
            onPointerMove={(e) => handlePointerMove(e, app.id)}
            onPointerUp={(e) => handlePointerUp(e, app.id)}
            onClick={() => handleClick(app.id)}
          >
            {/* Icon box */}
            <div
              className={`w-14 h-14 rounded-[14px] flex items-center justify-center shadow-xl overflow-hidden transition-all
                ${!app.iconImage ? `bg-gradient-to-br ${app.iconColor}` : ''}
                ${isSelected && !isDragging ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-black/20' : ''}
              `}
              style={{ boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.5)' }}
            >
              {app.iconImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.iconImage} alt={app.name} className="w-full h-full object-cover" draggable={false} />
              ) : app.icon && (
                <app.icon
                  size={28}
                  className="text-white drop-shadow-sm"
                  strokeWidth={1.8}
                />
              )}
            </div>
            {/* Label */}
            <span
              className={`text-[11px] font-medium text-center leading-tight px-1 max-w-full truncate
                ${isSelected ? 'bg-[#0066cc] text-white rounded px-1.5 py-0.5' : 'text-white'}
              `}
              style={{ textShadow: isSelected ? 'none' : '0 1px 4px rgba(0,0,0,0.9), 0 0px 2px rgba(0,0,0,1)' }}
            >
              {app.name}
            </span>
          </div>
        );
      })}
    </>
  );
}


interface DesktopProps {
  onDoubleClick: () => void;
  icons: DesktopIcon[];
  onUpdateIconsPositions: (updates: Record<string, { x: number; y: number }>) => void; // Batch update
  onIconDoubleClick: (iconId: string) => void;
  onOpenApp: (type: string, data?: any) => void;
}

// Helper for hiding native drag ghost
const emptyImage = new Image();
emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const desktopContextMenu: ContextMenuItemType[] = [
  { type: 'item', labelKey: 'menubar.items.newFolder', label: 'New Folder', action: 'new-folder', icon: FolderOpen },
  { type: 'item', labelKey: 'menubar.items.paste', label: 'Paste', action: 'paste', disabled: true, icon: Clipboard },
  { type: 'separator' },
  { type: 'item', labelKey: 'menubar.items.changeWallpaper', label: 'Change Wallpaper', action: 'change-wallpaper', icon: ImageIcon },
];

function DesktopComponent({ onDoubleClick, icons, onUpdateIconsPositions, onIconDoubleClick, onOpenApp }: DesktopProps) {
  const { accentColor, reduceMotion, disableShadows, wallpaper, activeUser } = useAppContext();
  const { moveNodeById, createDirectory, resolvePath, clipboard, copyNodes, cutNodes, pasteNodes, moveToTrash, getNodeAtPath } = useFileSystem();
  const { t } = useI18n();

  // Helpers
  const handleCopy = (id: string) => {
    copyNodes([id], activeUser);
  };

  const handleCut = (id: string) => {
    cutNodes([id], activeUser);
  };



  const handleMoveToTrash = (name: string) => {
    const fullPath = resolvePath(`~/Desktop/${name}`);
    moveToTrash(fullPath, activeUser);
  };

  const handleGetInfo = (name: string) => {
    const fullPath = resolvePath(`~/Desktop/${name}`);
    const node = getNodeAtPath(fullPath, activeUser);
    if (node) {
      const modDate = node.modified ? new Date(node.modified).toLocaleDateString() : t('a11y.common.notAvailable');
      const details = (
        <div className="flex flex-col gap-1 mt-1">
          <div className="grid grid-cols-[max-content_1fr] gap-x-2">
            <span className="text-white/50">{t('fileManager.details.type')}:</span>
            <span className="text-white/90">{node.type}</span>
            <span className="text-white/50">{t('fileManager.details.owner')}:</span>
            <span className="text-white/90">{node.owner}</span>
            <span className="text-white/50">{t('fileManager.details.permissions')}:</span>
            <span className="text-white/90 font-mono text-[11px]">{node.permissions || t('a11y.common.notAvailable')}</span>
            <span className="text-white/50">{t('fileManager.details.modified')}:</span>
            <span className="text-white/90">{modDate}</span>
            {node.size !== undefined && (
              <>
                <span className="text-white/50">{t('fileManager.details.size')}:</span>
                <span className="text-white/90">{t('fileManager.details.bytes', { count: node.size })}</span>
              </>
            )}
          </div>
        </div>
      );
      notify.system('success', node.name || t('notifications.subtitles.info'), details, t('notifications.subtitles.info'));
    } else {
      notify.system('error', t('notifications.subtitles.error'), t('fileManager.toasts.couldNotGetInfo'), t('notifications.subtitles.error'));
    }
  };
  useEffect(() => {
    const handleMenuAction = (e: CustomEvent) => {
      const { action, appId } = e.detail;
      if (appId !== 'desktop') return;

      switch (action) {
        case 'new-folder':
          createDirectory(resolvePath('~/Desktop'), t('menubar.items.newFolder'), activeUser);
          break;
        case 'paste':
          pasteNodes(resolvePath('~/Desktop'), activeUser);
          break;
        case 'change-wallpaper':
          // Open Settings -> Wallpapers section (via event + app open)
          window.dispatchEvent(new CustomEvent('aurora-open-settings-section', { detail: 'wallpapers' }));
          onOpenApp('settings');
          break;
      }
    };

    window.addEventListener('app-menu-action', handleMenuAction as EventListener);
    return () => window.removeEventListener('app-menu-action', handleMenuAction as EventListener);
  }, [createDirectory, resolvePath, onOpenApp, activeUser, pasteNodes, t]);

  // Selection State

  // Selection State
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);

  // Dragging State
  const [draggingIcons, setDraggingIcons] = useState<string[]>([]);
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  // Refs for current values in event listeners
  const iconsRef = useRef(icons);
  useEffect(() => { iconsRef.current = icons; }, [icons]);

  // Ref for mutable drag state to keep event listeners stable
  const dragStateRef = useRef({
    draggingIcons: [] as string[],
    dragStartPos: null as { x: number, y: number } | null,
  });

  // Sync refs with state
  useEffect(() => {
    dragStateRef.current.draggingIcons = draggingIcons;
    dragStateRef.current.dragStartPos = dragStartPos;
  }, [draggingIcons, dragStartPos]);

  // Handle Internal Drag Visuals via DragOver (Native DnD)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const { draggingIcons, dragStartPos } = dragStateRef.current;

    // If we are dragging internal icons, update the visual delta
    // We use e.clientX/Y from the dragover event on the container
    if (draggingIcons.length > 0 && dragStartPos) {
      setDragDelta({
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      // Case 1: Internal Drop (Desktop -> Desktop)
      if (data.source === 'desktop') {
        const { draggingIcons, dragStartPos } = dragStateRef.current;
        if (draggingIcons.length > 0 && dragStartPos) {
          const deltaX = e.clientX - dragStartPos.x;
          const deltaY = e.clientY - dragStartPos.y;

          const updates: Record<string, { x: number; y: number }> = {};

          draggingIcons.forEach(id => {
            const icon = iconsRef.current.find(i => i.id === id);
            if (icon) {
              const newX = icon.position.x + deltaX;
              let newY = icon.position.y + deltaY;
              newY = Math.max(0, newY);
              updates[id] = { x: newX, y: newY };
            }
          });

          if (Object.keys(updates).length > 0) {
            onUpdateIconsPositions(updates);
          }
        }
      }
      // Case 2: External Drop (Finder -> Desktop)
      else if (data.ids || data.id) {
        const idsToMove: string[] = data.ids || [data.id];

        idsToMove.forEach(id => {
          moveNodeById(id, '~/Desktop', undefined, data.sourceUser);
        });
      }
    } catch (err) {
      console.error('Failed to handle desktop drop', err);
    }

    // Reset state
    setDraggingIcons([]);
    setDragStartPos(null);
    setDragDelta({ x: 0, y: 0 });
  };

  const handleDragEnd = (_e: React.DragEvent) => {
    // Fired on the source element when drag completes (success or cancel)
    // This ensures we clean up if the drop happened outside or was cancelled
    setDraggingIcons([]);
    setDragStartPos(null);
    setDragDelta({ x: 0, y: 0 });
  };

  const handleDesktopMouseDown = (e: React.MouseEvent) => {
    // If clicking on background, clear selection unless Shift/Ctrl
    if (!e.shiftKey && !e.ctrlKey) {
      setSelectedIcons(new Set());
    }

    // Start selection box
    setSelectionBox({
      start: { x: e.clientX, y: e.clientY },
      current: { x: e.clientX, y: e.clientY }
    });
  };

  // Selection Box Logic (Keep mouse events for selection box ONLY)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (selectionBox) {
        setSelectionBox(prev => prev ? { ...prev, current: { x: e.clientX, y: e.clientY } } : null);
      }
    };

    const handleGlobalMouseUp = (_e: MouseEvent) => {
      if (selectionBox) {
        // Selection Box Commit
        const boxRect = {
          left: Math.min(selectionBox.start.x, selectionBox.current.x),
          top: Math.min(selectionBox.start.y, selectionBox.current.y),
          right: Math.max(selectionBox.start.x, selectionBox.current.x),
          bottom: Math.max(selectionBox.start.y, selectionBox.current.y)
        };

        const newSelection = new Set(selectedIcons);
        iconsRef.current.forEach(icon => {
          const iconCenter = { x: icon.position.x + 50, y: icon.position.y + 50 };
          if (
            iconCenter.x >= boxRect.left &&
            iconCenter.x <= boxRect.right &&
            iconCenter.y >= boxRect.top &&
            iconCenter.y <= boxRect.bottom
          ) {
            newSelection.add(icon.id);
          }
        });
        setSelectedIcons(newSelection);
        setSelectionBox(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectionBox, selectedIcons]);

  const handleIconMouseDown = (e: React.MouseEvent, iconId: string) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIcons);
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      if (newSelection.has(iconId)) newSelection.delete(iconId);
      else newSelection.add(iconId);
    } else {
      if (!newSelection.has(iconId)) {
        newSelection.clear();
        newSelection.add(iconId);
      }
    }
    setSelectedIcons(newSelection);
  };

  // --- Native Drag Support ---
  const handleNativeDragStart = (e: React.DragEvent, icon: DesktopIcon) => {
    // START DRAG
    const { clientX, clientY } = e;
    setDragStartPos({ x: clientX, y: clientY });

    // Set Dragged Items
    let itemsToDrag = Array.from(selectedIcons);
    if (!itemsToDrag.includes(icon.id)) {
      itemsToDrag = [icon.id];
      setSelectedIcons(new Set([icon.id]));
    }
    setDraggingIcons(itemsToDrag);

    // Set Native Data
    e.dataTransfer.setDragImage(emptyImage, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: icon.id,
      ids: itemsToDrag, // Multi-item support
      name: icon.name,
      type: icon.type === 'folder' ? 'directory' : 'file',
      source: 'desktop',
      sourceUser: activeUser // Pass source user context!
    }));
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={selectedIcons.size > 0 && !selectionBox}>
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-[background-image] duration-500"
          onMouseDown={handleDesktopMouseDown}
          onDoubleClick={onDoubleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            backgroundImage: `url(${WALLPAPERS[wallpaper] || WALLPAPERS.default})`,
          }}
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" />

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border border-blue-400/50 bg-blue-500/20 z-50 pointer-events-none"
              style={{
                left: Math.min(selectionBox.start.x, selectionBox.current.x),
                top: Math.min(selectionBox.start.y, selectionBox.current.y),
                width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                height: Math.abs(selectionBox.current.y - selectionBox.start.y),
              }}
            />
          )}

          {/* Desktop Icons */}
          {icons.map((icon) => (
            <ContextMenu key={icon.id}>
              <ContextMenuTrigger asChild>
                <DesktopIconItem
                  icon={icon}
                  selected={selectedIcons.has(icon.id)}
                  dragging={draggingIcons.includes(icon.id)}
                  dragDelta={dragDelta}
                  reduceMotion={reduceMotion}
                  disableShadows={disableShadows}
                  accentColor={accentColor}
                  onMouseDown={handleIconMouseDown}
                  onDragStart={handleNativeDragStart}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={onIconDoubleClick}
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onIconDoubleClick(icon.id)}>
                  <FolderOpen className="mr-2 h-4 w-4" /> {t('menubar.items.open') || 'Open'}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCopy(icon.id)}>
                  <Copy className="mr-2 h-4 w-4" /> {t('menubar.items.copy') || 'Copy'} <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCut(icon.id)}>
                  <Scissors className="mr-2 h-4 w-4" /> {t('menubar.items.cut') || 'Cut'} <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleGetInfo(icon.name)}>
                  <Info className="mr-2 h-4 w-4" /> {t('menubar.items.getInfo') || 'Get Info'}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleMoveToTrash(icon.name)}
                  className="text-red-400 focus:text-red-400 focus:bg-red-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {t('menubar.items.moveToTrash') || 'Move to Trash'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}

          {/* ── BEC Vortex App Shortcuts (Draggable Icons) ── */}
          <BECVortexDesktopIcons onOpenApp={onOpenApp} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {renderContextMenuItems(
          desktopContextMenu.map(item => {
            if (item.type === 'item' && item.action === 'paste') {
              return { ...item, disabled: clipboard.items.length === 0 };
            }
            return item;
          }),
          t,
          'desktop',
          'desktop'
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Memoized Icon Component to prevent unnecessary re-renders
interface DesktopIconItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDoubleClick' | 'onMouseDown' | 'onDragStart'> {
  icon: DesktopIcon;
  selected: boolean;
  dragging: boolean;
  dragDelta: { x: number; y: number };
  reduceMotion: boolean;
  disableShadows: boolean;
  accentColor: string;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, icon: DesktopIcon) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDoubleClick: (id: string) => void;
}

const DesktopIconItem = memo(forwardRef<HTMLDivElement, DesktopIconItemProps>(function DesktopIconItem({
  icon,
  selected,
  dragging,
  dragDelta,
  reduceMotion,
  disableShadows,
  accentColor,
  onMouseDown,
  onDragStart,
  onDragEnd,
  onDoubleClick,
  ...props
}, ref) {
  // Calculate temporary position if being dragged
  const position = dragging
    ? { x: icon.position.x + dragDelta.x, y: icon.position.y + dragDelta.y }
    : icon.position;

  return (
    <div
      ref={ref}
      {...props}
      draggable
      onDragStart={(e) => onDragStart(e, icon)}
      onDragEnd={onDragEnd}
      className={`absolute flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer select-none 
      ${(!reduceMotion && !dragging) ? 'transition-all duration-75' : ''} 
      ${selected ? 'bg-white/20 backdrop-blur-sm ring-1 ring-white/30' : 'hover:bg-white/5'} ${props.className || ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: '100px',
        // Disable transition during drag for instant feel
        transition: dragging ? 'none' : undefined
      }}
      onMouseDown={(e) => onMouseDown(e, icon.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(icon.id);
      }}
    >
      <div className={`relative w-14 h-14 mb-1 ${!disableShadows ? 'drop-shadow-lg' : ''}`}>
        <FileIcon
          name={icon.name}
          type={icon.type === 'folder' ? 'directory' : 'file'}
          accentColor={accentColor}
          className="w-full h-full"
          isEmpty={icon.isEmpty}
        />
      </div>

      <div className={`desktop-icon-label text-[11px] leading-tight text-white text-center px-2 py-0.5 rounded
      ${!disableShadows ? 'drop-shadow-md text-shadow-sm' : ''} truncate w-full`}>
        {icon.name}
      </div>
    </div>
  );
}));

export const Desktop = memo(DesktopComponent);
