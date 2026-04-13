"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

interface ResumeEntry {
    id: string;
    companyName?: string;
    jobTitle?: string;
    resumePath: string;
    imagePath: string;
    feedback: any;
    uploadedAt?: number; // timestamp from FSItem.created
    overallScore?: number;
}

const DataManager = () => {
    const { auth, isLoading, puterReady, fs, kv } = usePuterStore();
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<ResumeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmWipeAll, setConfirmWipeAll] = useState(false);
    const [status, setStatus] = useState('');
    const [fixingPaths, setFixingPaths] = useState(false);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate("/auth?next=/wipe");
    }, [isLoading]);

    useEffect(() => {
        if (!puterReady || !auth.isAuthenticated) return;
        loadResumes();
    }, [puterReady, auth.isAuthenticated]);

    const loadResumes = async () => {
        setLoading(true);
        try {
            const entries = (await kv.list('resume:*', true)) as KVItem[];
            if (!entries?.length) { setResumes([]); setLoading(false); return; }

            // Get file metadata for timestamps
            const files = (await fs.readDir('./')) as FSItem[] ?? [];
            const fileMap: Record<string, FSItem> = {};
            files.forEach(f => { fileMap[f.name] = f; });

            const parsed: ResumeEntry[] = entries.map(entry => {
                try {
                    const data = JSON.parse(entry.value);
                    const fileName = data.resumePath?.split('/').pop() ?? '';
                    const fileMeta = fileMap[fileName];
                    return {
                        ...data,
                        uploadedAt: fileMeta?.created ? fileMeta.created * 1000 : undefined,
                        overallScore: data.feedback?.overallScore,
                    };
                } catch { return null; }
            }).filter(Boolean) as ResumeEntry[];

            // Sort newest first
            parsed.sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0));
            setResumes(parsed);
        } catch(e) {
            console.error('Failed to load resumes:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOne = async (resume: ResumeEntry) => {
        setConfirmDeleteId(null);
        setDeletingId(resume.id);
        setStatus('');
        try {
            const currentUser = auth.user?.username;
            const fixPath = (p: string) => p && currentUser ? p.replace(/^\/[^\/]+\//, `/${currentUser}/`) : p;
            const resumePath = fixPath(resume.resumePath);
            const imagePath  = fixPath(resume.imagePath);
            try { await fs.delete(resumePath); } catch(e) { console.warn('PDF delete failed:', e); }
            try { await fs.delete(imagePath); } catch(e) { console.warn('Image delete failed:', e); }
            await kv.delete(`resume:${resume.id}`);
            setResumes(prev => prev.filter(r => r.id !== resume.id));
            setStatus('✓ Resume deleted successfully.');
        } catch(e: any) {
            setStatus('Failed to delete: ' + (e?.message ?? String(e)));
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteAll = async () => {
        setConfirmWipeAll(false);
        setLoading(true);
        setStatus('Deleting all data...');
        try {
            // flush() removes all KV entries at once
            await kv.flush();
            // Delete all files
            const files = (await fs.readDir('./')) as FSItem[] ?? [];
            for (const f of files) {
                try { await fs.delete(f.path); } catch(e) { console.warn('File delete failed:', f.name); }
            }
            setResumes([]);
            setStatus('✓ All data wiped successfully.');
        } catch(e: any) {
            setStatus('Wipe failed: ' + (e?.message ?? String(e)));
        } finally {
            setLoading(false);
        }
    };

    const handleFixPaths = async () => {
        const currentUser = auth.user?.username;
        if (!currentUser) return;
        setFixingPaths(true);
        setStatus('Fixing paths...');
        const entries = (await kv.list('resume:*', true)) as KVItem[];
        let fixed = 0;
        for (const entry of entries ?? []) {
            try {
                const data = JSON.parse(entry.value);
                const fixPath = (p: string) => p ? p.replace(/^\/[^\/]+\//, `/${currentUser}/`) : p;
                const r = fixPath(data.resumePath);
                const i = fixPath(data.imagePath);
                if (r !== data.resumePath || i !== data.imagePath) {
                    data.resumePath = r; data.imagePath = i;
                    await kv.set(entry.key, JSON.stringify(data));
                    fixed++;
                }
            } catch(e) {}
        }
        setStatus(fixed > 0 ? `✓ Fixed ${fixed} path(s) for @${currentUser}` : 'All paths already correct.');
        setFixingPaths(false);
        loadResumes();
    };

    const formatDate = (ts?: number) => {
        if (!ts) return 'Unknown date';
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const getScoreColor = (score?: number) => {
        if (!score) return 'bg-gray-100 text-gray-500';
        if (score >= 70) return 'bg-green-100 text-green-700';
        if (score >= 40) return 'bg-yellow-100 text-yellow-700';
        return 'bg-red-100 text-red-700';
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen !pt-0">
            <section className="main-section">
                <div className="page-heading py-10">
                    <h1>Data Manager</h1>
                    <h2>Manage your uploaded resumes and fix account issues</h2>
                </div>

                {/* Status message */}
                {status && (
                    <div className="max-w-[1200px] mx-auto px-6 mb-4">
                        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${status.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {status}
                        </div>
                    </div>
                )}

                <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-6 pb-16">

                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleFixPaths}
                            disabled={fixingPaths}
                            className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            🔧 {fixingPaths ? 'Fixing...' : 'Repair Broken Images'}
                        </button>
                        {!confirmWipeAll ? (
                            <button
                                onClick={() => setConfirmWipeAll(true)}
                                className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                            >
                                🗑️ Wipe All Data
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-2">
                                <span className="text-sm text-red-700 font-medium">Sab delete ho jayega, sure ho?</span>
                                <button onClick={handleDeleteAll} className="bg-red-500 text-white text-xs px-3 py-1 rounded-lg font-bold hover:bg-red-600">Haan, Delete Karo</button>
                                <button onClick={() => setConfirmWipeAll(false)} className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-lg font-bold hover:bg-gray-300">Cancel</button>
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {auth.user?.username?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700">@{auth.user?.username}</span>
                        </div>
                    </div>

                    {/* Resume Cards */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <img src="/images/resume-scan-2.gif" className="w-[180px]" />
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-xl font-medium">No resumes found</p>
                            <p className="text-sm mt-2">Upload your first resume to get started</p>
                            <Link to="/upload" className="primary-button w-fit mx-auto mt-6 inline-block">Upload Resume</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {resumes.map(resume => (
                                <div key={resume.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-lg leading-tight truncate">
                                                {resume.companyName || 'Unknown Company'}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {resume.jobTitle || 'No job title'}
                                            </p>
                                        </div>
                                        {resume.overallScore != null && (
                                            <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-sm font-bold ${getScoreColor(resume.overallScore)}`}>
                                                {resume.overallScore}/100
                                            </span>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {formatDate(resume.uploadedAt)}
                                    </div>

                                    {/* Score bars */}
                                    {resume.feedback && typeof resume.feedback === 'object' && (
                                        <div className="flex flex-col gap-1.5">
                                            {['ATS', 'toneAndStyle', 'content', 'structure', 'skills'].map(key => {
                                                const score = resume.feedback[key]?.score;
                                                const label: Record<string, string> = { ATS: 'ATS', toneAndStyle: 'Tone', content: 'Content', structure: 'Structure', skills: 'Skills' };
                                                if (score == null) return null;
                                                return (
                                                    <div key={key} className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label[key]}</span>
                                                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full ${score >= 70 ? 'bg-green-400' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                                                style={{ width: `${score}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500 w-6 text-right">{score}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                                        <Link
                                            to={`/resume/${resume.id}`}
                                            className="flex-1 text-center py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
                                        >
                                            View Review
                                        </Link>
                                        {confirmDeleteId === resume.id ? (
                                            <div className="flex gap-1 items-center">
                                                <button
                                                    onClick={() => handleDeleteOne(resume)}
                                                    disabled={deletingId === resume.id}
                                                    className="py-2 px-3 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold text-white transition-colors"
                                                >
                                                    {deletingId === resume.id ? '...' : 'Yes'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(resume.id)}
                                                disabled={deletingId === resume.id}
                                                className="py-2 px-3 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold text-red-600 transition-colors disabled:opacity-50"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};

export default DataManager;
