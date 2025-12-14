import React from 'react';
import { User } from '@/types';

interface BuyerProfileViewProps {
    user?: User | null;
}

const BuyerProfileView: React.FC<BuyerProfileViewProps> = ({ user }) => {
    const initials = user?.name?.slice(0, 1)?.toUpperCase() || user?.email?.slice(0, 1)?.toUpperCase() || 'U';

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-center text-xl font-bold">
                    {initials}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900">Your profile</h2>
                    <p className="text-sm text-gray-600">View your account details.</p>
                </div>
            </div>

            {!user && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
                    Sign in to view your profile information.
                </div>
            )}

            {user && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-gray-500">Name</div>
                            <div className="text-sm font-semibold text-slate-900">{user.name || '—'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Email</div>
                            <div className="text-sm font-semibold text-slate-900 break-words">{user.email}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Role</div>
                            <div className="text-sm font-semibold text-slate-900">{user.role || 'buyer'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Member since</div>
                            <div className="text-sm font-semibold text-slate-900">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">User ID</div>
                    <div className="text-[11px] font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 break-all">{user.id}</div>
                </div>
            )}
        </div>
    );
};

export default BuyerProfileView;
