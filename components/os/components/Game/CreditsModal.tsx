"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Wrench, Palette, Book, FlaskConical, Sprout, Sparkles, Bug, Github, Globe } from 'lucide-react';
import { cn } from '@/components/os/components/ui/utils';
import { feedback } from '@/components/os/services/soundFeedback';

const pkgMeta = {
    version: '0.8.5',
    license: 'AGPL-3.0',
    homepage: 'https://github.com/sangam-gaddi/BecVortex',
    build: { productName: 'BEC VORTEX OS' }
};


interface CreditsModalProps {
    onClose: () => void;
}

interface Contributor {
    name: string;
    role?: string;
    github?: string;
    website?: string;
    description?: string;
    socials?: { label: string; url: string }[];
}

interface ContributorCategory {
    id: string; // Added for tab mapping
    title: string;
    icon: React.ElementType;
    type?: 'people' | 'text' | 'special' | 'mixed';
    contributors?: Contributor[];
    content?: React.ReactNode;
}

const CREDITS_DATA: ContributorCategory[] = [
    {
        id: 'core',
        title: "Core Team",
        icon: Brain,
        type: 'people',
        contributors: [
            {
                name: "Sangam Gaddi",
                role: "Main Architect & Original Creator",
                github: "https://github.com/sangam-gaddi",
                description: "Wired and created BEC Vortex OS from scratch — full system architecture, core platform, payment system, and technical leadership.",
                socials: [
                    { label: "LI/sangam-gaddi", url: "https://www.linkedin.com/in/sangam-gaddi-8a9a84292/" },
                    { label: "GH/sangam-gaddi", url: "https://github.com/sangam-gaddi" },
                ]
            },
            {
                name: "Samarth Sugandhi",
                role: "UI / UX Designer & Event Organizer App",
                description: "Crafted the visual systems and interaction design of BEC Vortex OS, and handled the Event Organizer application.",
            },
            {
                name: "Yateesh Matuur",
                role: "AI Engineer — Voice Agent (ARIA)",
                description: "Handled the AI integrations, specializing in the ARIA voice agent powered by LiveKit, Deepgram, Cerebras, and Cartesia.",
            },
            {
                name: "Arshad",
                role: "System Hierarchy & Role-Based Architecture",
                description: "Designed the main system hierarchy and role-based access control (RBAC) model that governs the entire platform.",
            },
        ]
    },
    {
        id: 'design',
        title: "Design & UX",
        icon: Palette,
        type: 'text',
        content: (
            <div className="space-y-4 text-white/70 leading-relaxed text-sm">
                <p>
                    UI/UX led by <span className="text-white font-bold">Samarth Sugandhi</span> — visual systems, interaction concepts, component design, and the Event Organizer app interface.
                </p>
                <div className="border-t border-white/10 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Design Inspirations</h4>
                    <p>Heavily inspired by <span className="text-white">macOS</span> and <span className="text-white">Arch Linux</span>, especially <span className="text-white">Garuda OS</span> — for its bold aesthetics, retro-futuristic terminals, and clean system design philosophy.</p>
                </div>
            </div>
        )
    },
    {
        id: 'docs',
        title: "Docs",
        icon: Book,
        type: 'text',
        content: "(Guides, explanations, onboarding, clarifications)"
    },
    {
        id: 'testing',
        title: "Testing",
        icon: FlaskConical,
        type: 'text',
        content: "(Bug reports, edge cases, usability insights)"
    },
    {
        id: 'legacy',
        title: "Early Builders",
        icon: Sprout,
        type: 'text',
        content: (
            <div className="text-white/70 leading-relaxed text-sm">
                <p>People who helped shape BEC Vortex OS in its early experimental phase — through feedback, testing, design input, and belief in the project.</p>
                <div className="mt-4 space-y-2">
                    <p className="text-white/50 text-xs uppercase tracking-widest">The OG BEC BillDesk Team</p>
                    <p className="text-white">Soham Patil &middot; Krishna Bajantri &middot; Aditya Pattar</p>
                    <p className="text-white/50 text-xs mt-2">The original BEC BillDesk team whose work laid the foundation for what BEC Vortex became.</p>
                </div>
            </div>
        )
    },
    {
        id: 'community',
        title: "Community",
        icon: Wrench,
        type: 'text',
        content: (
            <div className="text-white/70 leading-relaxed text-sm space-y-4">
                <p>BEC Vortex OS is built for the students and faculty of Basaveshwar Engineering College. The community drives the feedback, testing, and future direction of the platform.</p>
                <p className="text-white/40 text-xs">Want to see your name here? Contribute to the project on <a href="https://github.com/sangam-gaddi/BecVortex" target="_blank" rel="noreferrer" className="text-white hover:underline">GitHub</a>.</p>
            </div>
        )
    },
    {
        id: 'special',
        title: "Special Thanks",
        icon: Sparkles,
        type: 'special',
        content: (
            <div className="text-white/70 leading-relaxed text-sm space-y-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">The OG BEC BillDesk Team</p>
                    <p>
                        A huge shoutout to the original BEC BillDesk team who laid the groundwork —{" "}
                        <span className="text-white font-bold">Soham Patil</span>,{" "}
                        <span className="text-white font-bold">Krishna Bajantri</span>, and{" "}
                        <span className="text-white font-bold">Aditya Pattar</span>.{" "}
                        Their early work and vision inspired and shaped what BEC Vortex OS became.
                    </p>
                </div>
                <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Design Inspiration</p>
                    <p>
                        Inspired by <span className="text-white">macOS</span> and the <span className="text-white">Arch Linux</span> ecosystem — especially <span className="text-white">Garuda OS</span> — for their bold aesthetics, terminal-driven workflows, and commitment to a powerful user experience.
                    </p>
                </div>
                <div className="border-t border-white/10 pt-4 text-white/40 text-xs">
                    To every student and faculty member of BEC who will use, test, and grow with this platform — thank you.
                </div>
            </div>
        )
    },
    {
        id: 'opensource',
        title: "Opensource",
        icon: Globe,
        type: 'mixed',
        contributors: [
            { name: "Eric Matyas", role: "Sound Effects", website: "https://soundimage.org/" }
        ],
        content: (
            <div className="space-y-8">
                <div className="text-white/70 leading-relaxed text-sm">
                    Thinking about building a similar project? <br />
                    <a href={pkgMeta.homepage} target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">{pkgMeta.build.productName}</a> is
                    built for educational purposes and is fully open-source. We believe in the power of shared knowledge
                    and collaborative innovation.
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Core Framework</h4>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://nextjs.org/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Next.js 14</a>
                            <a href="https://react.dev/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">React 18</a>
                            <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">TypeScript</a>
                            <a href="https://www.mongodb.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">MongoDB</a>
                            <a href="https://mongoosejs.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Mongoose</a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">UI & Design System</h4>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Tailwind v4</a>
                            <a href="https://ui.shadcn.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">shadcn/ui</a>
                            <a href="https://www.radix-ui.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Radix UI</a>
                            <a href="https://lucide.dev/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Lucide</a>
                            <a href="https://motion.dev/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Motion</a>
                            <a href="https://sonner.emilkowal.ski/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Sonner</a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">AI & Voice</h4>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://livekit.io/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">LiveKit</a>
                            <a href="https://deepgram.com/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Deepgram STT</a>
                            <a href="https://cerebras.ai/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Cerebras LLM</a>
                            <a href="https://cartesia.ai/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Cartesia TTS</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Payments & Auth</h4>
                        <div className="flex flex-wrap gap-2">
                            <a href="https://next-auth.js.org/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">NextAuth.js</a>
                            <a href="https://www.wagmi.sh/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Wagmi</a>
                            <a href="https://socket.io/" target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white hover:text-black transition-colors text-[10px] uppercase tracking-wider border border-white/10">Socket.io</a>
                        </div>
                    </div>
                </div>

                <div className="text-[10px] font-mono text-white/30 border-t border-white/10 pt-4">
                    Full source available at <a href="https://github.com/sangam-gaddi/BecVortex" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white decoration-white/30">github.com/sangam-gaddi/BecVortex</a>
                </div>
            </div>
        )
    }
];

export function CreditsModal({ onClose }: CreditsModalProps) {
    const [activeTab, setActiveTab] = useState<string>('core');

    // Add 'Contribute' as a virtual tab for the UI
    const tabs = useMemo(() => [
        ...CREDITS_DATA.map(c => ({ id: c.id, label: c.title, icon: c.icon })),
        { id: 'contribute', label: 'Contribute', icon: Bug }
    ], []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveTab(prev => {
                    const currentIndex = tabs.findIndex(t => t.id === prev);
                    let nextIndex;
                    if (e.key === 'ArrowUp') {
                        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    } else {
                        nextIndex = (currentIndex + 1) % tabs.length;
                    }
                    feedback.hover();
                    return tabs[nextIndex].id;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, tabs]);

    const activeCategory = CREDITS_DATA.find(c => c.id === activeTab);
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="terminal-card max-w-4xl w-full shadow-2xl relative flex flex-col overflow-hidden max-h-[85vh] font-mono text-white"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white bg-black">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white text-black border border-white">
                            <Sparkles className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-widest uppercase">Credits</h2>
                            <p className="text-xs text-white/50 uppercase tracking-widest font-mono mt-0.5">{pkgMeta.build.productName} v{pkgMeta.version}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { feedback.click(); onClose(); }}
                        className="p-2 hover:bg-white hover:text-black transition-colors border border-transparent hover:border-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-black border-r border-white p-4 space-y-1.5 overflow-y-auto custom-scrollbar shrink-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { feedback.click(); setActiveTab(tab.id); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-100 border-2",
                                    activeTab === tab.id
                                        ? "bg-white text-black border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]"
                                        : "bg-black text-white/50 border-transparent hover:border-white/50 hover:text-white"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-black" : "text-white/50")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto bg-black bg-size-[16px_16px] bg-[radial-gradient(#ffffff1a_1px,transparent_1px)]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.1 }}
                                className={cn("outline-none", activeTab === 'contribute' ? "h-full" : "min-h-full")}
                            >
                                {activeTab === 'contribute' ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                                        <div className="p-6 border-2 border-white bg-white/5 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                                            <Bug className="w-12 h-12" />
                                        </div>
                                        <div className="space-y-4 max-w-md">
                                            <h3 className="text-2xl font-bold uppercase tracking-widest text-white">Contribute</h3>
                                            <p className="text-white/60 leading-relaxed text-sm">
                                                <a href={pkgMeta.homepage} target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">{pkgMeta.build.productName}</a> is shared with {pkgMeta.license} license.<br />
                                                Help us squash bugs, improve performance, or design the next big feature.
                                            </p>
                                        </div>
                                        <a
                                            href="https://github.com/sangam-gaddi/BecVortex"
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() => feedback.click()}
                                            className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-transparent transition-all border-2 border-transparent hover:border-white hover:text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
                                        >
                                            Contribute on GitHub
                                        </a>
                                    </div>
                                ) : activeCategory ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                                            <activeCategory.icon className="w-6 h-6 text-white/40" />
                                            <h3 className="text-2xl font-bold uppercase tracking-widest text-white">{activeCategory.title}</h3>
                                        </div>

                                        {/* Variant: People (Grid) */}
                                        {activeCategory.contributors && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {activeCategory.contributors.map((contributor) => (
                                                    <div
                                                        key={contributor.name}
                                                        className="group relative p-5 bg-black border border-white/20 hover:border-white transition-all flex flex-col gap-3 shadow-none hover:shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-bold text-lg text-white group-hover:text-black group-hover:bg-white inline-block px-1 transition-colors uppercase">
                                                                    {contributor.name}
                                                                </div>
                                                                {contributor.role && (
                                                                    <div className="text-xs font-mono text-white/50 uppercase tracking-wider mt-1 border-l-2 border-white/20 pl-2">
                                                                        {contributor.role}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {contributor.github && (
                                                                <a
                                                                    href={contributor.github}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1 hover:bg-white hover:text-black text-white/40 transition-colors border border-transparent hover:border-white"
                                                                    title="GitHub Profile"
                                                                >
                                                                    <Github className="w-5 h-5" />
                                                                </a>
                                                            )}
                                                            {contributor.website && (
                                                                <a
                                                                    href={contributor.website}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1 hover:bg-white hover:text-black text-white/40 transition-colors border border-transparent hover:border-white"
                                                                    title="Website"
                                                                >
                                                                    <Globe className="w-5 h-5" />
                                                                </a>
                                                            )}
                                                        </div>

                                                        {contributor.description && (
                                                            <p className="text-[10px] text-white/60 leading-relaxed border-t border-white/10 pt-2 mt-1">
                                                                {contributor.description}
                                                            </p>
                                                        )}

                                                        {contributor.socials && contributor.socials.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                                                {contributor.socials.map((social) => (
                                                                    <a
                                                                        key={social.url}
                                                                        href={social.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-[10px] px-2 py-1 bg-zinc-900 hover:bg-white hover:text-black text-zinc-500 border border-zinc-800 hover:border-white transition-all uppercase tracking-wider"
                                                                    >
                                                                        {social.label}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Variant: Special / Content (Boxed) */}
                                        {(activeCategory.type === 'special' || activeCategory.type === 'mixed') && activeCategory.content && (
                                            <div className={cn(
                                                "bg-zinc-950 border border-zinc-800 p-8 leading-loose text-white/80 font-mono text-sm shadow-inner",
                                                activeCategory.type === 'mixed' && "mt-8"
                                            )}>
                                                {activeCategory.content}
                                            </div>
                                        )}

                                        {/* Variant: Text (Simple Centered) */}
                                        {activeCategory.type === 'text' && activeCategory.content && (
                                            <div className="px-1 py-8">
                                                <p className="text-white/60 italic leading-relaxed text-lg font-serif opacity-80 text-center border-l-2 border-white/20 pl-6">
                                                    {activeCategory.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white bg-black text-[10px] text-white/40 font-mono tracking-widest flex justify-between items-start px-4">
                    <span className="text-left text-[10px] leading-tight">
                        <span className="uppercase">©2025 <a href={pkgMeta.homepage} target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">{pkgMeta.build.productName}</a> // <a href="https://instagram.com/mental.os" target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">BEC VORTEX OS</a> // <a href="https://facebook.com/dopepxls" target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">BEC Team</a> // BEC Studio</span><br />
                        {pkgMeta.build.productName} and its original concepts, architecture, and visual identity are protected by copyright.<br />
                        Source code is licensed under {pkgMeta.license}. See <a href="https://github.com/bec-team/bec-vortex-os.js/blob/main/LICENSE" target="_blank" rel="noreferrer" className="text-white hover:text-(--accent-user) decoration-white/30 hover:decoration-(--accent-user)">LICENSE</a> for details.
                    </span>
                    <span>{activeTab.toUpperCase()}</span>
                </div>
            </motion.div>
        </div>
    );
}
