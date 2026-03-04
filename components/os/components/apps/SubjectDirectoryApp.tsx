"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getSubjects, createSubject, deleteSubject } from '@/lib/actions/subject.actions';
import { Book, Plus, Trash2, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_COLORS: Record<string, string> = {
    BSC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ESC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ETC: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    PLC: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    HSSC: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

export default function SubjectDirectoryApp() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<number | 'all'>('all');
    const [expandedSem, setExpandedSem] = useState<Record<number, boolean>>({});
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        subjectCode: '',
        title: '',
        credits: 3,
        category: 'ESC',
        semester: 1,
        applicableBranches: 'ALL'
    });

    useEffect(() => { loadSubjects(); }, []);

    const loadSubjects = async () => {
        setLoading(true);
        const res = await getSubjects();
        if (res.success) setSubjects(res.subjects);
        else toast.error(String(res.error || 'Failed to load subjects.'));
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const branchArray = formData.applicableBranches.split(',').map(b => b.trim().toUpperCase());
        const res = await createSubject({ ...formData, applicableBranches: branchArray });
        if (res.success) {
            toast.success('Subject added to directory!');
            setIsAdding(false);
            setFormData({ subjectCode: '', title: '', credits: 3, category: 'ESC', semester: 1, applicableBranches: 'ALL' });
            loadSubjects();
        } else {
            toast.error(String(res.error || 'Failed to create.'));
        }
    };

    const handleDelete = async (id: string, code: string) => {
        const toastId = toast.loading(`Preparing to delete ${code}...`);

        // Custom toast-based confirm
        toast.dismiss(toastId);
        toast(
            (t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-semibold text-white">Delete <span className="text-red-400 font-mono">{code}</span>?</p>
                    <p className="text-sm text-white/60">This will permanently remove the subject from all records.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setDeletingId(id);
                                const res = await deleteSubject(id);
                                setDeletingId(null);
                                if (res.success) { toast.success(`${code} removed from directory.`); loadSubjects(); }
                                else toast.error(String(res.error || 'Delete failed.'));
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg font-bold"
                        >
                            Yes, Delete
                        </button>
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg">
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            { duration: 10000, style: { background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }
        );
    };

    // Get distinct semesters from data
    const allSemesters = [...new Set(subjects.map(s => s.semester))].sort((a, b) => a - b);

    const filteredSubjects = subjects.filter(s =>
        (activeTab === 'all' || s.semester === activeTab) &&
        (s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Group by semester for the "All" view
    const groupedBySem = allSemesters.reduce((acc, sem) => {
        acc[sem] = filteredSubjects.filter(s => s.semester === sem);
        return acc;
    }, {} as Record<number, any[]>);

    const toggleSemExpand = (sem: number) => {
        setExpandedSem(prev => ({ ...prev, [sem]: !prev[sem] }));
    };

    const SubjectCard = ({ sub }: { sub: any }) => (
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start justify-between hover:border-blue-500/20 transition-all group">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-white font-mono text-sm">{sub.subjectCode}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${CATEGORY_COLORS[sub.category] || 'bg-gray-500/20 text-gray-400'}`}>
                        {sub.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
                        {sub.credits} cr
                    </span>
                </div>
                <p className="text-sm text-white/80 mb-2 truncate">{sub.title}</p>
                <p className="text-xs text-emerald-400/70">
                    {sub.applicableBranches[0] === 'ALL' ? '✦ All Branches' : sub.applicableBranches.join(' · ')}
                </p>
            </div>
            <button
                onClick={() => handleDelete(sub._id, sub.subjectCode)}
                disabled={deletingId === sub._id}
                className="ml-3 p-2 text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
                {deletingId === sub._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
        </div>
    );

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-blue-900/20 border-b border-light/5 p-5 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-400/30">
                                <Book className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Subject Master Directory</h1>
                                <p className="text-xs text-blue-300/60">{subjects.length} subjects across {allSemesters.length} semesters</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Subject
                        </button>
                    </div>

                    {/* Add Form */}
                    {isAdding && (
                        <div className="p-5 border-b border-light/5 bg-blue-950/20">
                            <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { label: 'Subject Code', key: 'subjectCode', placeholder: 'e.g. 22UMA103C', type: 'text' },
                                    { label: 'Title', key: 'title', placeholder: 'Mathematics for CS-I', type: 'text' },
                                ].map(f => (
                                    <div key={f.key} className={f.key === 'title' ? 'col-span-2 md:col-span-1' : ''}>
                                        <label className="text-xs text-white/50 mb-1 block">{f.label}</label>
                                        <input required value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} type={f.type} placeholder={f.placeholder} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-xs text-white/50 mb-1 block">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm [&>option]:bg-gray-900">
                                        {['BSC', 'ESC', 'ETC', 'PLC', 'HSSC'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 mb-1 block">Credits</label>
                                    <input type="number" required value={formData.credits} onChange={e => setFormData({ ...formData, credits: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 mb-1 block">Semester</label>
                                    <input type="number" required min="1" max="8" value={formData.semester} onChange={e => setFormData({ ...formData, semester: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                    <label className="text-xs text-white/50 mb-1 block">Branches (comma-separated or ALL)</label>
                                    <input required value={formData.applicableBranches} onChange={e => setFormData({ ...formData, applicableBranches: e.target.value })} placeholder="CS, IS, AI, BT  or  ALL" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div className="col-span-2 md:col-span-3 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Save Subject</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Search + Semester Tabs */}
                    <div className="px-5 pt-4 pb-0 shrink-0 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
                            <input
                                type="text" placeholder="Search by code or title..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-blue-500/50 text-sm"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                                All ({subjects.length})
                            </button>
                            {allSemesters.map(sem => (
                                <button
                                    key={sem}
                                    onClick={() => setActiveTab(sem)}
                                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === sem ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                >
                                    Sem {sem} ({subjects.filter(s => s.semester === sem).length})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : filteredSubjects.length === 0 ? (
                            <div className="text-center py-16 text-white/30 border border-dashed border-white/10 rounded-xl">No subjects found.</div>
                        ) : activeTab !== 'all' ? (
                            // Single Semester: flat grid
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredSubjects.map(sub => <SubjectCard key={sub._id} sub={sub} />)}
                            </div>
                        ) : (
                            // All: grouped by semester with accordion
                            <div className="space-y-4">
                                {allSemesters.map(sem => {
                                    const semSubjects = groupedBySem[sem] || [];
                                    if (semSubjects.length === 0) return null;
                                    const isOpen = expandedSem[sem] !== false; // default open

                                    return (
                                        <div key={sem} className="border border-white/5 rounded-2xl overflow-hidden">
                                            <button
                                                onClick={() => toggleSemExpand(sem)}
                                                className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-white/8 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 text-blue-400 text-sm font-bold flex items-center justify-center">{sem}</span>
                                                    <span className="font-semibold text-white">Semester {sem}</span>
                                                    <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{semSubjects.length} subjects</span>
                                                </div>
                                                {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                            </button>

                                            {isOpen && (
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/20">
                                                    {semSubjects.map(sub => <SubjectCard key={sub._id} sub={sub} />)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
}
