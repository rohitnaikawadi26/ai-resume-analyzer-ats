"use client";

import { Link, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { useEffect, useState } from "react";

export const meta = () => ([
    { title: 'Ai-Powered Resume Analyzer | Profile' },
    { name: 'description', content: 'Manage your account and settings' },
]);

const Profile = () => {
    const { auth, isLoading } = usePuterStore();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate('/auth?next=/profile');
        }
    }, [auth.isAuthenticated, isLoading, navigate]);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await auth.signOut();
            navigate('/auth?next=/');
        } catch (error) {
            console.error('Sign out failed:', error);
            setSigningOut(false);
        }
    };

    if (isLoading) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex items-center justify-center">
                <p className="text-gray-500 text-lg">Loading...</p>
            </main>
        );
    }

    if (!auth.isAuthenticated || !auth.user) {
        return null;
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">


            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Account Profile</h1>
                    <h2>Manage your account settings and information</h2>

                    <div className="mt-12 max-w-md mx-auto">
                        {/* Profile Card */}
                        <div className="gradient-border shadow-lg">
                            <div className="flex flex-col gap-8 bg-white rounded-2xl p-8">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {auth.user.username?.[0]?.toUpperCase() ?? 'U'}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-gray-900">{auth.user.username}</h3>
                                        <p className="text-sm text-gray-500 mt-1">Account ID: {auth.user.uuid}</p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <div className="flex flex-col gap-4">
                                        {/* Account Details */}
                                        <div className="space-y-3">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                                                <p className="text-gray-900 font-medium">{auth.user.username}</p>
                                            </div>

                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">User ID</label>
                                                <p className="text-gray-900 font-medium text-sm break-all font-mono">{auth.user.uuid}</p>
                                            </div>
                                        </div>

                                        {/* Account Status */}
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span className="text-sm font-semibold text-green-700">Account Active</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sign Out Button */}
                                <button
                                    onClick={handleSignOut}
                                    disabled={signingOut}
                                    className="mt-4 w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                >
                                    {signingOut ? 'Signing out...' : 'Sign Out'}
                                </button>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-6 text-center">
                            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Profile;
