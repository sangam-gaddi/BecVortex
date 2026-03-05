"use client";
import { ComponentType, LazyExoticComponent, lazy } from 'react';
import dynamic from 'next/dynamic';
import { LucideIcon, FolderOpen, Settings, Mail, Calendar, Image, Music, Terminal, Globe, MessageSquare, FileText, Code, ShoppingBag, CreditCard, MessageCircle, GraduationCap, UserPlus, Book, Users, FileSignature, BookOpen, ClipboardList, LayoutGrid, FileSpreadsheet, CalendarCheck, Star } from 'lucide-react';
import { AppMenuConfig, ContextMenuConfig } from '../types';

// Menu Configurations
import {
    finderMenuConfig, finderContextMenuConfig,
    settingsMenuConfig,
    photosMenuConfig,
    musicMenuConfig,
    messagesMenuConfig,
    browserMenuConfig,
    terminalMenuConfig, terminalContextMenuConfig,
    devCenterMenuConfig,
    notepadMenuConfig,
    calendarMenuConfig,
    appStoreMenuConfig,
    mailMenuConfig
} from './app-menus';

// Dynamic Load Components
const FileManager = dynamic(() => import('@/components/os/components/FileManager').then(module => module.FileManager), { ssr: false });
const SettingsApp = dynamic(() => import('@/components/os/components/Settings').then(module => module.Settings), { ssr: false });
const Photos = dynamic(() => import('@/components/os/components/apps/Photos').then(module => module.Photos), { ssr: false });
const MusicApp = dynamic(() => import('@/components/os/components/apps/Music').then(module => module.Music), { ssr: false });
const Messages = dynamic(() => import('@/components/os/components/apps/Messages').then(module => module.Messages), { ssr: false });
const Browser = dynamic(() => import('@/components/os/components/apps/Browser').then(module => module.Browser), { ssr: false });
const TerminalApp = dynamic(() => import('@/components/os/components/apps/Terminal').then(module => module.Terminal), { ssr: false });
const DevCenter = dynamic(() => import('@/components/os/components/apps/DevCenter').then(module => module.DevCenter), { ssr: false });
const Notepad = dynamic(() => import('@/components/os/components/apps/Notepad').then(module => module.Notepad), { ssr: false });
const CalendarApp = dynamic(() => import('@/components/os/components/apps/Calendar').then(module => module.Calendar), { ssr: false });
const AppStoreComponent = dynamic(() => import('@/components/os/components/apps/AppStore').then(module => module.AppStore), { ssr: false });
const MailApp = dynamic(() => import('@/components/os/components/apps/Mail').then(module => module.Mail), { ssr: false });
const BECPayApp = dynamic(() => import('@/components/os/components/apps/BECPay').then(module => module.BECPay), { ssr: false });
const BECChatApp = dynamic(() => import('@/components/os/components/apps/BECChat').then(module => module.BECChat), { ssr: false });
const BECPortalApp = dynamic(() => import('@/components/os/components/apps/BECPortal').then(module => module.BECPortal), { ssr: false });
const AccountManagerApp = dynamic(() => import('@/components/os/components/apps/AccountManager').then(module => module.AccountManager), { ssr: false });
const AdmitApp = dynamic(() => import('@/components/os/components/apps/AdmitApp').then(module => module.AdmitApp), { ssr: false });
const SubjectDirectoryApp = dynamic(() => import('@/components/os/components/apps/SubjectDirectoryApp'), { ssr: false });
const SubjectAssignerApp = dynamic(() => import('@/components/os/components/apps/SubjectAssignerApp'), { ssr: false });
const ReRegistrationReviewApp = dynamic(() => import('@/components/os/components/apps/ReRegistrationReviewApp'), { ssr: false });
const CourseRegistrationApp = dynamic(() => import('@/components/os/components/apps/CourseRegistrationApp'), { ssr: false });
const TeachingAssignerApp = dynamic(() => import('@/components/os/components/apps/TeachingAssignerApp'), { ssr: false });
const FacultyDashboardApp = dynamic(() => import('@/components/os/components/apps/FacultyDashboardApp'), { ssr: false });
const MarksUploadApp = dynamic(() => import('@/components/os/components/apps/MarksUploadApp'), { ssr: false });
const AttendanceUploadApp = dynamic(() => import('@/components/os/components/apps/AttendanceUploadApp'), { ssr: false });
const CRAssignerApp = dynamic(() => import('@/components/os/components/apps/CRAssignerApp'), { ssr: false });

export interface AppMetadata {
    id: string;
    name: string;
    nameKey?: string;
    description: string;
    descriptionKey?: string;
    icon: LucideIcon;
    iconColor: string;           // Gradient class for dock
    iconSolid: string;           // Solid color fallback
    category: 'productivity' | 'media' | 'utilities' | 'development' | 'system' | 'admin' | 'academic' | 'management';
    isCore: boolean;             // Cannot be uninstalled
    component: ComponentType<any>;
    dockOrder?: number;          // Order in dock (lower = earlier)
    menu?: AppMenuConfig;        // App-specific menu configuration
    contextMenu?: ContextMenuConfig; // Context menu configuration
    size?: number;               // Size in MB (approximate/simulated)
    ramUsage?: number;           // Base RAM usage in MB (gamified)
    allowedRoles?: string[];     // RBAC: only these roles can see/use this app. undefined = all roles.
    defaultSize?: { width: number, height: number }; // Default window size
}

// Centralized App Registry
export const APP_REGISTRY: Record<string, AppMetadata> = {
    // Core Apps (cannot be uninstalled)
    finder: {
        id: 'finder',
        name: 'Finder',
        description: 'File Manager',
        descriptionKey: 'appDescriptions.finder',
        icon: FolderOpen,
        iconColor: 'from-blue-500 to-blue-600',
        iconSolid: '#3b82f6',
        category: 'system',
        isCore: true,
        component: FileManager,
        dockOrder: 1,
        menu: finderMenuConfig,
        contextMenu: finderContextMenuConfig,
        size: 50,
        ramUsage: 300,
    },
    browser: {
        id: 'browser',
        name: 'Browser',
        description: 'Access the web',
        descriptionKey: 'appDescriptions.browser',
        icon: Globe,
        iconColor: 'from-blue-400 to-indigo-500',
        iconSolid: '#6366f1',
        category: 'utilities',
        isCore: true,
        component: Browser,
        dockOrder: 2,
        menu: browserMenuConfig,
        size: 280,
        ramUsage: 450,
    },
    mail: {
        id: 'mail',
        name: 'Mail',
        description: 'Read and write emails',
        descriptionKey: 'appDescriptions.mail',
        icon: Mail,
        iconColor: 'from-blue-400 to-sky-400',
        iconSolid: '#38bdf8',
        category: 'productivity',
        isCore: true,
        component: MailApp,
        dockOrder: 3,
        menu: mailMenuConfig,
        size: 120,
        ramUsage: 250,
    },
    appstore: {
        id: 'appstore',
        name: 'App Store',
        description: 'Download and manage apps',
        descriptionKey: 'appDescriptions.appStore',
        icon: ShoppingBag,
        iconColor: 'from-sky-500 to-blue-500',
        iconSolid: '#0ea5e9',
        category: 'system',
        isCore: true,
        component: AppStoreComponent,
        dockOrder: 4,
        menu: appStoreMenuConfig,
        size: 90,
        ramUsage: 200,
    },
    terminal: {
        id: 'terminal',
        name: 'Terminal',
        description: 'Command line interface',
        descriptionKey: 'appDescriptions.terminal',
        icon: Terminal,
        iconColor: 'from-gray-700 to-gray-800',
        iconSolid: '#374151',
        category: 'development',
        isCore: true,
        component: TerminalApp,
        dockOrder: 9,
        menu: terminalMenuConfig,
        contextMenu: terminalContextMenuConfig,
        size: 15,
        ramUsage: 100,
    },
    settings: {
        id: 'settings',
        name: 'System Settings',
        description: 'Configure your system',
        descriptionKey: 'appDescriptions.systemSettings',
        icon: Settings,
        iconColor: 'from-slate-500 to-zinc-600',
        iconSolid: '#71717a',
        category: 'system',
        isCore: true,
        component: SettingsApp,
        dockOrder: 10,
        menu: settingsMenuConfig,
        size: 85,
        ramUsage: 150,
    },

    // Optional Apps (can be installed/uninstalled)
    notepad: {
        id: 'notepad',
        name: 'Notepad',
        description: 'Edit text files',
        descriptionKey: 'appDescriptions.notepad',
        icon: FileText,
        iconColor: 'from-yellow-400 to-amber-500',
        iconSolid: '#f59e0b',
        category: 'productivity',
        isCore: false,
        component: Notepad,
        dockOrder: 4,
        menu: notepadMenuConfig,
        size: 35,
        ramUsage: 150,
    },
    messages: {
        id: 'messages',
        name: 'Messages',
        description: 'Chat with friends',
        descriptionKey: 'appDescriptions.messages',
        icon: MessageSquare,
        iconColor: 'from-green-500 to-emerald-600',
        iconSolid: '#10b981',
        category: 'productivity',
        isCore: false,
        component: Messages,
        dockOrder: 5,
        menu: messagesMenuConfig,
        size: 140,
        ramUsage: 250,
    },
    calendar: {
        id: 'calendar',
        name: 'Calendar',
        description: 'Manage your schedule',
        descriptionKey: 'appDescriptions.calendar',
        icon: Calendar,
        iconColor: 'from-red-500 to-red-600',
        iconSolid: '#ef4444',
        category: 'productivity',
        isCore: false,
        component: CalendarApp,
        dockOrder: 6,
        menu: calendarMenuConfig,
        size: 50,
        ramUsage: 250,
    },
    photos: {
        id: 'photos',
        name: 'Photos',
        description: 'View and manage photos',
        descriptionKey: 'appDescriptions.photos',
        icon: Image,
        iconColor: 'from-pink-500 to-rose-600',
        iconSolid: '#e11d48',
        category: 'media',
        isCore: false,
        component: Photos,
        dockOrder: 7,
        menu: photosMenuConfig,
        size: 180,
        ramUsage: 350,
    },
    music: {
        id: 'music',
        name: 'Music',
        description: 'Play your favorite music',
        descriptionKey: 'appDescriptions.music',
        icon: Music,
        iconColor: 'from-purple-500 to-purple-600',
        iconSolid: '#a855f7',
        category: 'media',
        isCore: false,
        component: MusicApp,
        dockOrder: 8,
        menu: musicMenuConfig,
        size: 210,
        ramUsage: 300,
    },

    'dev-center': {
        id: 'dev-center',
        name: 'DevCenter',
        description: 'Developer Tools',
        descriptionKey: 'appDescriptions.devCenter',
        icon: Code,
        iconColor: 'from-indigo-500 to-purple-600',
        iconSolid: '#6366f1',
        category: 'development',
        isCore: false,
        component: DevCenter,
        dockOrder: 12,
        menu: devCenterMenuConfig,
        size: 550,
        ramUsage: 1000,
        allowedRoles: ['MASTER'],
    },

    // ── BEC BillDesk Apps ──
    'bec-pay': {
        id: 'bec-pay',
        name: 'BEC Pay',
        description: 'Fee payments & invoices',
        icon: CreditCard,
        iconColor: 'from-emerald-500 to-teal-600',
        iconSolid: '#10b981',
        category: 'productivity',
        isCore: true,
        component: BECPayApp,
        dockOrder: 3,
        size: 60,
        ramUsage: 200,
        allowedRoles: ['STUDENT'],
    },
    'bec-chat': {
        id: 'bec-chat',
        name: 'BEC Chat',
        description: 'Campus messaging',
        icon: MessageCircle,
        iconColor: 'from-violet-500 to-purple-600',
        iconSolid: '#8b5cf6',
        category: 'productivity',
        isCore: true,
        component: BECChatApp,
        dockOrder: 4,
        size: 45,
        ramUsage: 200,
        allowedRoles: ['STUDENT', 'FACULTY'],
    },
    'bec-portal': {
        id: 'bec-portal',
        name: 'BEC Portal',
        description: 'Student login & dashboard',
        icon: GraduationCap,
        iconColor: 'from-blue-500 to-indigo-600',
        iconSolid: '#3b82f6',
        category: 'productivity',
        isCore: true,
        component: BECPortalApp,
        dockOrder: 2,
        size: 50,
        ramUsage: 150,
        allowedRoles: ['STUDENT'],
    },
    // ── Admin Apps ──
    'account-manager': {
        id: 'account-manager',
        name: 'Account Manager',
        description: 'Create and manage staff accounts',
        icon: UserPlus,
        iconColor: 'from-blue-500 to-purple-600',
        iconSolid: '#6366f1',
        category: 'admin',
        isCore: true,
        component: AccountManagerApp,
        dockOrder: 1,
        size: 30,
        ramUsage: 100,
        allowedRoles: ['MASTER', 'PRINCIPAL', 'HOD'],
    },
    'admit-app': {
        id: 'admit-app',
        name: 'Admit',
        description: 'Student Onboarding and Admission System',
        icon: GraduationCap,
        iconColor: 'from-emerald-500 to-teal-600',
        iconSolid: '#10b981',
        category: 'admin',
        isCore: true,
        component: AdmitApp,
        dockOrder: 2,
        size: 45,
        ramUsage: 120,
        allowedRoles: ['OFFICER'],
    },
    'subject-directory': {
        id: 'subject-directory',
        name: 'Subject Directory',
        description: 'Define syllabus subjects',
        icon: Book,
        iconColor: 'from-sky-500 to-blue-600',
        iconSolid: '#0ea5e9',
        category: 'admin',
        isCore: true,
        component: SubjectDirectoryApp,
        dockOrder: 3,
        size: 20,
        ramUsage: 80,
        allowedRoles: ['OFFICER'],
    },
    'subject-assigner': {
        id: 'subject-assigner',
        name: 'Subject Assigner',
        description: 'Bulk apply subjects to students',
        icon: Users,
        iconColor: 'from-emerald-500 to-emerald-600',
        iconSolid: '#10b981',
        category: 'admin',
        isCore: true,
        component: SubjectAssignerApp,
        dockOrder: 4,
        size: 30,
        ramUsage: 100,
        allowedRoles: ['OFFICER'],
    },
    're-registration': {
        id: 're-registration',
        name: 'Re-Registration',
        description: 'Review manual backlog requests',
        icon: FileSignature,
        iconColor: 'from-purple-500 to-purple-600',
        iconSolid: '#8b5cf6',
        category: 'admin',
        isCore: true,
        component: ReRegistrationReviewApp,
        dockOrder: 5,
        size: 40,
        ramUsage: 150,
        allowedRoles: ['OFFICER'],
    },
    'course-registration': {
        id: 'course-registration',
        name: 'Course Registration',
        description: 'Register for semester subjects & backlogs',
        icon: BookOpen,
        iconColor: 'from-indigo-500 to-indigo-600',
        iconSolid: '#6366f1',
        category: 'productivity',
        isCore: true,
        component: CourseRegistrationApp,
        dockOrder: 5,
        size: 45,
        ramUsage: 150,
        allowedRoles: ['STUDENT'],
    },

    // ── Faculty Management Apps ──
    'teaching-assigner': {
        id: 'teaching-assigner',
        name: 'Teaching Assigner',
        description: 'Assign subjects to faculty members',
        icon: ClipboardList,
        iconColor: 'from-violet-500 to-indigo-600',
        iconSolid: '#7c3aed',
        category: 'admin',
        isCore: true,
        component: TeachingAssignerApp,
        dockOrder: 6,
        size: 30,
        ramUsage: 100,
        allowedRoles: ['HOD'],
    },
    'faculty-dashboard': {
        id: 'faculty-dashboard',
        name: 'Faculty Dashboard', // Renamed from My Classes for the new interface
        description: 'Manage your assigned subjects and access evaluation tools.',
        icon: GraduationCap,
        iconColor: 'from-indigo-500 to-blue-600',
        iconSolid: '#4f46e5',
        category: 'academic',
        isCore: true,
        component: FacultyDashboardApp,
        dockOrder: 3,
        size: 25,
        ramUsage: 80,
        allowedRoles: ['FACULTY'],
        defaultSize: { width: 800, height: 550 },
    },
    'marks-upload': {
        id: 'marks-upload',
        name: 'Marks Evaluator',
        description: 'Upload and convert student marks for CIE and SEE.',
        icon: FileSpreadsheet,
        iconColor: 'from-blue-400 to-blue-500',
        iconSolid: '#3b82f6',
        category: 'academic',
        isCore: true,
        component: MarksUploadApp,
        dockOrder: 7, // Added dockOrder
        size: 40, // Added size
        ramUsage: 120, // Added ramUsage
        allowedRoles: ['FACULTY'],
        defaultSize: { width: 900, height: 650 }, // Needs wide table, but restrained to fit 1080p well
    },
    'attendance-upload': {
        id: 'attendance-upload',
        name: 'Rapid Attendance',
        description: 'Log daily class attendance using absent-only entry.',
        icon: CalendarCheck,
        iconColor: 'from-emerald-400 to-emerald-500',
        iconSolid: '#10b981',
        category: 'academic',
        isCore: true,
        component: AttendanceUploadApp,
        dockOrder: 8, // Added dockOrder
        size: 35, // Added size
        ramUsage: 100, // Added ramUsage
        allowedRoles: ['FACULTY'],
        defaultSize: { width: 800, height: 600 },
    },
    'cr-assigner': {
        id: 'cr-assigner',
        name: 'CR Assigner',
        description: 'Appoint Class Representatives for your department semesters.',
        icon: Star,
        iconColor: 'from-purple-400 to-purple-500',
        iconSolid: '#a855f7',
        category: 'management',
        isCore: true,
        component: CRAssignerApp,
        dockOrder: 9, // Added dockOrder
        size: 30, // Added size
        ramUsage: 90, // Added ramUsage
        allowedRoles: ['FACULTY'],
        defaultSize: { width: 750, height: 500 },
    },
};

// ── Role Filtering Helper ──
function filterByRole(apps: AppMetadata[], role?: string): AppMetadata[] {
    if (!role) return apps; // No role = show all (backward compat)
    return apps.filter(app => {
        if (!app.allowedRoles) return true; // No restriction = available to all
        return app.allowedRoles.includes(role);
    });
}

// Helper functions
export function getApp(appId: string): AppMetadata | undefined {
    return APP_REGISTRY[appId];
}

export function getAllApps(role?: string): AppMetadata[] {
    return filterByRole(Object.values(APP_REGISTRY), role);
}

export function getCoreApps(role?: string): AppMetadata[] {
    return getAllApps(role).filter(app => app.isCore);
}

export function getOptionalApps(role?: string): AppMetadata[] {
    return getAllApps(role).filter(app => !app.isCore);
}

export function getDockApps(installedAppIds: Set<string>, role?: string): AppMetadata[] {
    return getAllApps(role)
        .filter(app => app.isCore || installedAppIds.has(app.id))
        .filter(app => app.dockOrder !== undefined)
        .sort((a, b) => (a.dockOrder || 999) - (b.dockOrder || 999));
}

export function getAppsByCategory(category: AppMetadata['category'], role?: string): AppMetadata[] {
    return getAllApps(role).filter(app => app.category === category);
}

