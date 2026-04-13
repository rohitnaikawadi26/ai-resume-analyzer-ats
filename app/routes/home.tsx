"use client";

import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ai-Powered Resume Analyzer" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'score-desc' | 'score-asc'>('default');
  const [filterCompany, setFilterCompany] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list('resume:*', true)) as KVItem[];

      const parsedResumes = resumes?.map((resume) => (
          JSON.parse(resume.value) as Resume
      ))

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  const companies = [...new Set(resumes.map(r => r.companyName).filter(Boolean))] as string[];

  const filteredResumes = resumes
    .filter(r => {
      const q = searchQuery.toLowerCase();
      return (
        (!q || (r.jobTitle?.toLowerCase().includes(q) ?? false) || (r.companyName?.toLowerCase().includes(q) ?? false))
        && (!filterCompany || r.companyName === filterCompany)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score-desc') return (b.feedback?.overallScore ?? 0) - (a.feedback?.overallScore ?? 0);
      if (sortBy === 'score-asc') return (a.feedback?.overallScore ?? 0) - (b.feedback?.overallScore ?? 0);
      return 0;
    });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelectedIds([]);
  };

  return <main className="home-background bg-cover">

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
        ): (
          <h2>Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <>
          {/* Filter / Sort / Search + Compare Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px] outline-none focus:border-gray-500"
            />
            {companies.length > 1 && (
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-gray-500"
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-gray-500"
            >
              <option value="default">Sort: Default</option>
              <option value="score-desc">Sort: Highest Score</option>
              <option value="score-asc">Sort: Lowest Score</option>
            </select>
            {!compareMode ? (
              <button
                onClick={() => setCompareMode(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Compare Resumes
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Select 2 resumes ({selectedIds.length}/2)</span>
                {selectedIds.length === 2 && (
                  <button
                    onClick={() => navigate(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`)}
                    className="primary-button text-sm px-4 py-2"
                  >
                    Compare Selected
                  </button>
                )}
                <button
                  onClick={handleCancelCompare}
                  className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {filteredResumes.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No resumes match your search.</p>
          ) : (
            <div className="resumes-section">
              {filteredResumes.map((resume) =>
                compareMode ? (
                  <div
                    key={resume.id}
                    className={`relative cursor-pointer rounded-2xl transition-all ${
                      selectedIds.includes(resume.id) ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent'
                    }`}
                    onClick={() => toggleSelect(resume.id)}
                  >
                    <div
                      className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm"
                      style={{
                        borderColor: selectedIds.includes(resume.id) ? '#3b82f6' : '#d1d5db',
                        backgroundColor: selectedIds.includes(resume.id) ? '#3b82f6' : 'white',
                      }}
                    >
                      {selectedIds.includes(resume.id) && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div className="pointer-events-none">
                      <ResumeCard resume={resume} />
                    </div>
                  </div>
                ) : (
                  <ResumeCard key={resume.id} resume={resume} />
                )
              )}
            </div>
          )}
        </>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}
