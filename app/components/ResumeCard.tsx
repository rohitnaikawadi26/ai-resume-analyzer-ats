"use client";
import { Link } from "react-router-dom";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    return (
        <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    <ScoreCircle score={feedback.overallScore} />
                </div>
            </div>
            <div className="gradient-border animate-in fade-in duration-1000">
                <div className="w-full h-full">
                    {resumeUrl && !imgError ? (
                        <img
                            src={resumeUrl}
                            alt="resume"
                            onError={() => setImgError(true)}
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top rounded-2xl"
                        />
                    ) : (
                        <div className="w-full h-[350px] max-sm:h-[200px] flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl text-gray-400">
                            <img src="/icons/warning.svg" alt="no preview" className="w-8 h-8 opacity-40" />
                            <p className="text-sm">{resumeUrl ? 'Preview unavailable' : 'Loading preview...'}</p>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
export default ResumeCard
