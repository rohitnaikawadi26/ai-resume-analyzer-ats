"use client";

import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import {prepareInstructions} from "../../constants";

export const meta = () => ([
    { title: 'Ai-Powered Resume Analyzer | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, puterReady, fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isLoadingResume, setIsLoadingResume] = useState(true);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [resumeData, setResumeData] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        // Wait for puter to be ready and user to be authenticated
        if (!puterReady || !auth.isAuthenticated) return;

        const loadResume = async () => {
            setIsLoadingResume(true);
            setLoadError('');
            try {
                const resume = await kv.get(`resume:${id}`);
                if(!resume) {
                    setLoadError('Resume not found. It may have been deleted.');
                    setIsLoadingResume(false);
                    return;
                }

                const data = JSON.parse(resume);
                setResumeData(data);

                // Load files regardless of feedback status
                try {
                    const resumeBlob = await fs.read(data.resumePath);
                    if (resumeBlob) {
                        const pdfBlob = new Blob([resumeBlob as BlobPart], { type: 'application/pdf' });
                        setResumeUrl(URL.createObjectURL(pdfBlob));
                    }
                } catch(e) { console.warn('PDF load failed:', e); }

                try {
                    const imageBlob = await fs.read(data.imagePath);
                    if (imageBlob) {
                        const imgBlob = new Blob([imageBlob as BlobPart], { type: 'image/png' });
                        setImageUrl(URL.createObjectURL(imgBlob));
                    }
                } catch(e) { console.warn('Image load failed:', e); }

                if (data.feedback && typeof data.feedback === 'object') {
                    setFeedback(data.feedback);
                } else {
                    // Feedback missing — show re-analyze option
                    setLoadError('no-feedback');
                }
            } catch(err) {
                console.error('Failed to load resume:', err);
                setLoadError(err instanceof Error ? err.message : 'Failed to load resume data.');
            } finally {
                setIsLoadingResume(false);
            }
        }

        loadResume();
    }, [id, puterReady, auth.isAuthenticated]);

    const handleReanalyze = async () => {
        if (!resumeData) return;
        setIsReanalyzing(true);
        setLoadError('');
        try {
            const result = await ai.feedback(
                resumeData.resumePath,
                prepareInstructions({ jobTitle: resumeData.jobTitle || '', jobDescription: resumeData.jobDescription || '' }),
                resumeData.imagePath
            );
            if (!result) { setLoadError('Re-analysis failed. Please try again.'); setIsReanalyzing(false); return; }

            let feedbackText = typeof result.message.content === 'string'
                ? result.message.content
                : (result.message.content[0] as any)?.text ?? '';

            const cleaned = feedbackText.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();

            if (/^(i'?m sorry|i cannot|i can'?t|i am unable|sorry,|as an ai)/i.test(cleaned)) {
                setLoadError('AI could not read your resume. The PDF may be scanned or image-only.');
                setIsReanalyzing(false);
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                setLoadError('AI returned an unreadable response. Please try again.');
                setIsReanalyzing(false);
                return;
            }

            const updated = { ...resumeData, feedback: parsed };
            await kv.set(`resume:${id}`, JSON.stringify(updated));
            setResumeData(updated);
            setFeedback(parsed);
        } catch(err) {
            setLoadError(err instanceof Error ? err.message : 'Re-analysis failed.');
        } finally {
            setIsReanalyzing(false);
        }
    };

    return (
        <main className="!pt-0">
            <style>{`
                @media print {
                    .resume-nav { display: none !important; }
                    .resume-left-panel { display: none !important; }
                    .resume-right-panel { width: 100% !important; max-width: 100% !important; }
                    .resume-layout { display: block !important; }
                    .download-pdf-btn { display: none !important; }
                }
            `}</style>
            <div className="flex flex-row w-full max-lg:flex-col-reverse resume-layout">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center resume-left-panel">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover resume-right-panel">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                        {feedback && !isLoadingResume && (
                            <button
                                onClick={() => window.print()}
                                className="download-pdf-btn px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                                title="Save as PDF"
                            >
                                ⬇ Download PDF
                            </button>
                        )}
                    </div>
                    {isLoadingResume && (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                    {!isLoadingResume && loadError === 'no-feedback' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-6 py-4 w-full text-center">
                                <p className="font-semibold text-lg">Analysis not found for this resume</p>
                                <p className="text-sm mt-1">The AI analysis may have failed previously. You can re-analyze it now.</p>
                            </div>
                            <button
                                className="primary-button w-fit self-center"
                                onClick={handleReanalyze}
                                disabled={isReanalyzing}
                            >
                                {isReanalyzing ? 'Re-analyzing...' : 'Re-Analyze Resume'}
                            </button>
                            {isReanalyzing && <img src="/images/resume-scan-2.gif" className="w-full" />}
                        </div>
                    )}
                    {!isLoadingResume && loadError && loadError !== 'no-feedback' && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 w-full text-center">
                            <p className="font-semibold text-lg">Could not load review</p>
                            <p className="text-sm mt-1">{loadError}</p>
                        </div>
                    )}
                    {!isLoadingResume && feedback && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
