"use client";

import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import FileUploader from '~/components/FileUploader';
import { usePuterStore } from '~/lib/puter';
import { useNavigate } from 'react-router';
import { convertPdfToImage } from '~/lib/pdf2img';
import { generateUUID } from '~/lib/utils';
import { prepareInstructions } from '../../constants';
import Summary from '~/components/Summary';
import ATS from '~/components/ATS';
import Details from '~/components/Details';

const Upload = () => {
    const { auth, isLoading, puterReady, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    // analysis states
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [isError, setIsError] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [resultData, setResultData] = useState<any>(null);
    const [resultImageUrl, setResultImageUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // new: fill mode & controlled form fields
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    const setError = (msg: string) => {
        setIsError(true);
        setIsProcessing(false);
        setStatusText(msg);
    };

    const handleFileSelect = (f: File | null) => setFile(f);

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        if (!puterReady) return setError('Service not ready yet. Please wait a moment and try again.');
        if (!auth.isAuthenticated) return navigate('/auth?next=/upload');

        setIsProcessing(true);
        setIsError(false);
        setIsSubmitted(false);
        setResultData(null);

        try {
            // Generate UUID early so we can use it as unique file path
            const uuid = generateUUID();

            setStatusText('Uploading resume to cloud...');
            // Use fs.write (programmatic) instead of fs.upload (opens picker UI)
            const uploadedFile = await fs.write(`resume_${uuid}.pdf`, file) as unknown as FSItem;
            if (!uploadedFile || !uploadedFile.path) return setError('Failed to upload resume. Please try again.');

            setStatusText('Converting PDF to image...');
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) return setError('Failed to convert PDF to image. Make sure it is a valid PDF.');
            // Store the local image URL so we can show it instantly after analysis
            const localImageUrl = imageFile.imageUrl;

            setStatusText('Uploading preview image...');
            const uploadedImage = await fs.write(`resume_${uuid}.png`, imageFile.file) as unknown as FSItem;
            if (!uploadedImage || !uploadedImage.path) return setError('Failed to upload preview image. Please try again.');

            setStatusText('Saving your resume info...');
            const data: any = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, jobTitle, jobDescription,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setIsSubmitted(true);

            setStatusText('AI is analyzing your resume (this may take a minute)...');

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription }),
                uploadedImage.path
            );
            if (!feedback) return setError('Failed to get AI feedback. Please try again.');

            // Safely extract text from AI response (content can be string or array)
            let feedbackText = '';
            if (typeof feedback.message.content === 'string') {
                feedbackText = feedback.message.content;
            } else if (Array.isArray(feedback.message.content) && feedback.message.content.length > 0) {
                const first = feedback.message.content[0] as any;
                feedbackText = first.text ?? first.value ?? JSON.stringify(first);
            }

            if (!feedbackText) return setError('AI returned an empty response. Please try again.');

            // Strip markdown code fences if AI wraps JSON
            const cleanedText = feedbackText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();

            // Check if AI returned an apology instead of JSON
            if (/^(i'?m sorry|i cannot|i can'?t|i am unable|sorry,|as an ai)/i.test(cleanedText)) {
                return setError('AI could not read your resume. Please make sure the PDF is not scanned/image-only, then try again.');
            }

            let parsedFeedback;
            try {
                parsedFeedback = JSON.parse(cleanedText);
            } catch {
                console.error('Raw AI response that failed to parse:', feedbackText);
                return setError('AI returned an unreadable response. Please try again.');
            }

            data.feedback = parsedFeedback;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setIsProcessing(false);
            setResultImageUrl(localImageUrl);
            setResultData(data);
        } catch (err: any) {
            // Extract as much detail as possible from the error
            const msg = err?.message
                || err?.error
                || (typeof err === 'string' ? err : null)
                || JSON.stringify(err)
                || 'An unexpected error occurred. Please try again.';
            console.error('Analysis error (full):', err);
            setError(msg);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file) return;
        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover !pt-0">
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>

                    {/* Error State */}
                    {isError && (
                        <div className="flex flex-col items-center gap-4 mt-6">
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 w-full text-center">
                                <p className="font-semibold text-lg">Something went wrong</p>
                                <p className="text-sm mt-1">{statusText}</p>
                            </div>
                            <button
                                className="primary-button w-fit"
                                onClick={() => { setIsError(false); setStatusText(''); setIsSubmitted(false); }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && !isError && (
                        <div className="flex flex-col items-center gap-4 mt-6">
                            {isSubmitted && (
                                <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-6 py-4 w-full text-center">
                                    <p className="font-semibold text-lg">✓ Your resume is submitted successfully!</p>
                                    <p className="text-sm mt-1">AI is analyzing your resume, please wait...</p>
                                </div>
                            )}
                            <p className="text-gray-500 text-sm">{statusText}</p>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </div>
                    )}

                    {/* Result State */}
                    {resultData && !isProcessing && !isError && (
                        <div className="flex flex-col gap-6 mt-6 animate-in fade-in duration-700">
                            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-6 py-4 w-full text-center">
                                <p className="font-semibold text-xl">✓ Your resume is submitted successfully!</p>
                                <p className="text-sm mt-1">Here are your AI-powered results</p>
                            </div>
                            {resultImageUrl && (
                                <div className="gradient-border w-fit self-center">
                                    <img src={resultImageUrl} className="max-h-[400px] object-contain rounded-2xl" alt="resume preview" />
                                </div>
                            )}
                            <Summary feedback={resultData.feedback} />
                            <ATS score={resultData.feedback.ATS?.score || 0} suggestions={resultData.feedback.ATS?.tips || []} />
                            <Details feedback={resultData.feedback} />
                            <button
                                className="primary-button w-fit self-center"
                                onClick={() => navigate(`/resume/${resultData.id}`)}
                            >
                                View Full Review Page
                            </button>
                        </div>
                    )}

                    {/* Form State */}
                    {!isProcessing && !resultData && !isError && (
                        <>
                            {!puterReady && (
                                <p className="text-sm text-gray-400 text-center mt-2 animate-pulse">Connecting to service...</p>
                            )}
                            <h2>Drop your resume for an ATS score and improvement tips</h2>

                            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">

                                {/* Fields — always visible, manually typed */}
                                <div className="form-div">
                                    <label htmlFor="job-title">Job Title</label>
                                    <input
                                        type="text"
                                        id="job-title"
                                        placeholder="e.g. Frontend Developer"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                    />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-description">Job Description</label>
                                    <textarea
                                        id="job-description"
                                        rows={6}
                                        placeholder="Paste the job description here manually..."
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                    />
                                </div>
                                <div className="form-div">
                                    <label>Upload Resume (PDF)</label>
                                    <FileUploader onFileSelect={handleFileSelect} />
                                </div>
                                <button className="primary-button" type="submit" disabled={!puterReady || !file}>
                                    {puterReady ? 'Analyze Resume' : 'Connecting...'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};
export default Upload;
