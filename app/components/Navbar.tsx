"use client";

import {Link, useLocation, useNavigate} from "react-router";
import {usePuterStore} from "~/lib/puter";
import {useState, useRef, useEffect} from "react";

const Navbar = () => {
    const { auth } = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeProfileDropdownIfMouseAway = () => {
        setTimeout(() => {
            if (dropdownRef.current && !dropdownRef.current.matches(':hover')) {
                setProfileDropdownOpen(false);
            }
        }, 100);
    };

    const handleSignOut = async () => {
        await auth.signOut();
        setProfileDropdownOpen(false);
        navigate('/auth?next=/');
    };

    const isActive = (path: string) =>
        location.pathname === path ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-gray-900";

    return (
        <nav className="navbar">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
                <p className="text-xl font-bold text-gradient">ResumeAI</p>
            </Link>

            {/* Center Nav Links */}
            <div className="flex items-center gap-6 max-sm:hidden">
                <Link to="/" className={`text-sm transition-colors ${isActive('/')}`}>
                    Home
                </Link>
                <Link to="/upload" className={`text-sm transition-colors ${isActive('/upload')}`}>
                    Upload Resume
                </Link>
                <Link to="/wipe" className={`text-sm transition-colors ${isActive('/wipe')}`}>
                    Data Manager
                </Link>
            </div>

            {/* Right — User + Upload button */}
            <div className="flex items-center gap-3">
                {auth.isAuthenticated && auth.user && (
                    <div 
                        ref={dropdownRef}
                        className="relative"
                    >
                        {/* Profile Button */}
                        <button
                            onMouseEnter={() => setProfileDropdownOpen(true)}
                            onMouseLeave={closeProfileDropdownIfMouseAway}
                            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {auth.user.username?.[0]?.toUpperCase() ?? 'U'}
                            </div>
                            <span className="text-sm text-gray-700 font-medium max-w-[100px] truncate max-sm:hidden">
                                {auth.user.username}
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {profileDropdownOpen && (
                            <div
                                onMouseEnter={() => setProfileDropdownOpen(true)}
                                onMouseLeave={() => setProfileDropdownOpen(false)}
                                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                                {/* User Info Header */}
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                    <p className="text-sm font-semibold text-gray-900">{auth.user.username}</p>
                                </div>

                                {/* Menu Items */}
                                <div className="p-2">
                                    <Link 
                                        to="/profile"
                                        onClick={() => setProfileDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 text-sm font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Full Profile
                                    </Link>
                                    <button 
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 text-sm font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <Link to="/upload" className="primary-button w-fit text-sm py-2 px-4 max-sm:hidden">
                    + New Resume
                </Link>

                {/* Mobile menu button */}
                <button
                    className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
                    <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
                    <div className="w-5 h-0.5 bg-gray-600"></div>
                </button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="absolute top-20 left-4 right-4 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex flex-col gap-3 z-50 sm:hidden">
                    <Link to="/" className="text-sm text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Home</Link>
                    <Link to="/upload" className="text-sm text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Upload Resume</Link>
                    <Link to="/wipe" className="text-sm text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Data Manager</Link>
                    {auth.isAuthenticated && auth.user && (
                        <>
                            <div className="border-t border-gray-100 pt-3 mt-2">
                                <p className="text-xs font-semibold text-gray-500 px-3 mb-2">PROFILE</p>
                                <Link to="/profile" className="text-sm text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 block" onClick={() => setMenuOpen(false)}>My Profile</Link>
                                <button 
                                    onClick={() => {
                                        handleSignOut();
                                        setMenuOpen(false);
                                    }}
                                    className="w-full text-left text-sm text-red-600 font-medium py-2 px-3 rounded-lg hover:bg-red-50"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}
export default Navbar
