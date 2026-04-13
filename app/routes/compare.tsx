"use client";

import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

export const meta = () => ([
    { title: 'AI Resume Analyzer | Compare Resumes' },
    { name: 'description', content: 'Side-by-side resume score comparison' },
]);

const ScoreBar = ({ score, flip = false }: { score: number; flip?: boolean }) => {
    const barColor = score > 69 ? 'bg-green-500' : score > 49 ? 'bg-yellow-500' : 'bg-red-500';
    const textColor = score > 69 ? 'text-green-700' : score > 49 ? 'text-yellow-700' : 'text-red-700';
    return (
        <div className={`flex items-center gap-2 ${flip ? 'flex-row-reverse' : ''}`}>
            <span className={`font-bold text-sm w-8 text-center shrink-0 ${textColor}`}>{score}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                    className={`${barColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
};

const CompareRow = ({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) => {
    const betterA = scoreA > scoreB;
    const betterB = scoreB > scoreA;
    return (
        <div className="grid grid-cols-[1fr_110px_1fr] items-center py-3 border-b border-gray-100 last:border-0 gap-2">
            <div className={betterA ? '' : 'opacity-50'}>
                <ScoreBar score={scoreA} flip />
            </div>
            <p className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <div className={betterB ? '' : 'opacity-50'}>
                <ScoreBar score={scoreB} />
            </div>
        </div>
    );
};

const Compare = () => {
    const [searchParams] = useSearchParams();
    const { auth, kv, fs, isLoading } = usePuterStore();
    const navigate = useNavigate();
    const [resumeA, setResumeA] = useState<any>(null);
    const [resumeB, setResumeB] = useState<any>(null);
    const [imageA, setImageA] = useState('');
    const [imageB, setImageB] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const idA = searchParams.get('a');
    const idB = searchParams.get('b');

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/compare`);
    }, [isLoading]);

    useEffect(() => {
        if (!idA || !idB) {
            setError('Two resume IDs are required for comparison.');
            setLoading(false);
            return;
        }
        if (!auth.isAuthenticated) return;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [rawA, rawB] = await Promise.all([
                    kv.get(`resume:${idA}`),
                    kv.get(`resume:${idB}`),
                ]);
                if (!rawA || !rawB) {
                    setError('One or both resumes could not be found.');
                    setLoading(false);
                    return;
                }
                const dA = JSON.parse(rawA);
                const dB = JSON.parse(rawB);
                setResumeA(dA);
                setResumeB(dB);

                try {
                    const bA = await fs.read(dA.imagePath);
                    if (bA) setImageA(URL.createObjectURL(new Blob([bA as BlobPart], { type: 'image/png' })));
                } catch { /* image load failed silently */ }

                try {
                    const bB = await fs.read(dB.imagePath);
                    if (bB) setImageB(URL.createObjectURL(new Blob([bB as BlobPart], { type: 'image/png' })));
                } catch { /* image load failed silently */ }

            } catch {
                setError('Failed to load resumes for comparison.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [idA, idB, auth.isAuthenticated]);

    const getScore = (data: any, key: string) => {
        if (!data?.feedback) return 0;
        if (key === 'overall') return data.feedback.overallScore ?? 0;
        return data.feedback[key]?.score ?? 0;
    };

    const rows = [
        { label: 'Overall', key: 'overall' },
        { label: 'ATS', key: 'ATS' },
        { label: 'Tone & Style', key: 'toneAndStyle' },
        { label: 'Content', key: 'content' },
        { label: 'Structure', key: 'structure' },
        { label: 'Skills', key: 'skills' },
    ];

    const hasFeedback = resumeA?.feedback && resumeB?.feedback;
    const scoreA = getScore(resumeA, 'overall');
    const scoreB = getScore(resumeB, 'overall');
    const winnerLabel = !hasFeedback
        ? ''
        : scoreA > scoreB
        ? `${resumeA.jobTitle || 'Resume A'} @ ${resumeA.companyName || ''}`
        : scoreB > scoreA
        ? `${resumeB.jobTitle || 'Resume B'} @ ${resumeB.companyName || ''}`
        : 'Tied!';

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen !pt-0">
            <section className="main-section py-10">
                <div className="page-heading py-8">
                    <h1>Resume Comparison</h1>
                    <h2>Side-by-side score breakdown</h2>
                </div>

                {loading && (
                    <div className="flex justify-center">
                        <img src="/images/resume-scan-2.gif" className="w-[200px]" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 text-center">
                        <p className="font-semibold">{error}</p>
                        <Link to="/" className="text-sm underline mt-2 inline-block">Go back</Link>
                    </div>
                )}

                {!loading && resumeA && resumeB && (
                    <div className="flex flex-col gap-6">
                        {/* Winner Banner */}
                        {hasFeedback && winnerLabel && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-6 py-4 text-center">
                                <p className="text-green-700 text-lg">
                                    🏆 <span className="font-bold">Better Resume: {winnerLabel}</span>
                                </p>
                            </div>
                        )}

                        {/* Column headers */}
                        <div className="grid grid-cols-2 gap-4">
                            {([{ data: resumeA, img: imageA }, { data: resumeB, img: imageB }]).map(({ data, img }, i) => (
                                <div key={i} className="flex flex-col gap-3 items-center">
                                    <div className="text-center">
                                        <h3 className="font-bold text-base text-gray-800">{data.companyName || 'Company'}</h3>
                                        <p className="text-sm text-gray-500">{data.jobTitle || 'Position'}</p>
                                    </div>
                                    {img ? (
                                        <div className="gradient-border w-full">
                                            <img
                                                src={img}
                                                alt="resume preview"
                                                className="w-full max-h-[280px] object-cover object-top rounded-xl"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-[180px] bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm border border-gray-200">
                                            No preview
                                        </div>
                                    )}
                                    <Link to={`/resume/${data.id}`} className="primary-button w-fit text-sm">
                                        View Full Review
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Score Breakdown Table */}
                        {hasFeedback && (
                            <div className="bg-white rounded-2xl shadow-md p-6">
                                <h3 className="text-lg font-bold text-center mb-4">Score Breakdown</h3>
                                {rows.map(({ label, key }) => (
                                    <CompareRow
                                        key={key}
                                        label={label}
                                        scoreA={getScore(resumeA, key)}
                                        scoreB={getScore(resumeB, key)}
                                    />
                                ))}
                            </div>
                        )}

                        {!hasFeedback && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-6 py-4 text-center">
                                <p>One or both resumes don't have AI analysis yet. Please re-analyze them first.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
};

export default Compare;
