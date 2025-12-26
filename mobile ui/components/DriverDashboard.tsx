import React, { useEffect, useState } from 'react';
import { fetchActiveDeliveryJobs, completeDeliveryWithProof } from '../../lib/api';
import { DeliveryAssignment } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import MobileDeliveryDocs from './MobileDeliveryDocs';

import DriverEarningsView from './DriverEarningsView';

interface DriverDashboardProps {
    partnerId: string;
    driverName: string;
    onSignOut: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ partnerId, driverName, onSignOut }) => {
    const [activeJobs, setActiveJobs] = useState<DeliveryAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyingJobId, setVerifyingJobId] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<'dashboard' | 'earnings'>('dashboard');

    useEffect(() => {
        const loadJobs = async () => {
            setLoading(true);
            const jobs = await fetchActiveDeliveryJobs(partnerId);
            setActiveJobs(jobs);
            setLoading(false);
        };

        loadJobs();

        // Subscribe to assignment changes
        const subscription = supabase
            .channel('driver_jobs')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'delivery_assignments',
                filter: `partner_id=eq.${partnerId}`
            }, () => {
                loadJobs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [partnerId]);

    const initiateDelivery = (jobId: string) => {
        setVerifyingJobId(jobId);
    };

    const handleDeliveryComplete = async (proofUrl: string, proofType: 'photo' | 'signature') => {
        if (!verifyingJobId) return;

        const job = activeJobs.find(j => j.id === verifyingJobId);
        if (!job) return;

        const success = await completeDeliveryWithProof(job.order_id, proofUrl, proofType);

        if (success) {
            alert('Delivery verified and completed successfully!');
            setActiveJobs(prev => prev.filter(j => j.id !== verifyingJobId));
        } else {
            alert('Failed to complete delivery. Please try again.');
        }
        setVerifyingJobId(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-6"></div>
                <p className="text-slate-400 font-medium">Fetching assignments...</p>
            </div>
        );
    }

    if (currentView === 'earnings') {
        return <DriverEarningsView onBack={() => setCurrentView('dashboard')} />;
    }

    return (
        <div className="bg-gray-950 min-h-screen text-white pb-24">
            {verifyingJobId && activeJobs.find(j => j.id === verifyingJobId) && (
                <MobileDeliveryDocs
                    orderId={activeJobs.find(j => j.id === verifyingJobId)!.order_id}
                    onComplete={handleDeliveryComplete}
                    onCancel={() => setVerifyingJobId(null)}
                />
            )}

            {/* Premium Driver Header */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-6 pt-14 pb-10 rounded-b-[3rem] relative overflow-hidden border-b border-gray-800/50">
                {/* Gradient glow orbs */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px]"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">On Duty</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">{driverName}</h1>
                        </div>
                        <button onClick={onSignOut} className="w-12 h-12 rounded-2xl bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-gray-400 border border-gray-700/50 active:scale-90 transition-transform">
                            <span className="material-icons-round text-lg">logout</span>
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-stretch gap-3">
                        <div className="flex-1 bg-gray-800/60 backdrop-blur-md p-5 rounded-3xl border border-gray-700/50">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Active Jobs</p>
                            <p className="text-3xl font-black text-white">{activeJobs.length}</p>
                        </div>
                        <div
                            onClick={() => setCurrentView('earnings')}
                            className="flex-1 bg-gradient-to-br from-primary to-orange-600 p-5 rounded-3xl shadow-xl shadow-primary/30 active:scale-95 transition-transform cursor-pointer relative overflow-hidden"
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                            <div className="flex justify-between items-start relative">
                                <div>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Revenue Today</p>
                                    <p className="text-3xl font-black text-white">{formatCurrency(activeJobs.reduce((acc, curr) => acc + (curr.delivery_fee || 0), 0))}</p>
                                </div>
                                <span className="material-icons-round text-white/30 text-lg">chevron_right</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Jobs List */}
            <div className="px-6 mt-10">
                <h3 className="text-xl font-black tracking-tight mb-6 flex items-center justify-between">
                    <span>Active Assignments</span>
                    {activeJobs.length > 0 && <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></span>}
                </h3>

                <div className="space-y-6">
                    {activeJobs.length === 0 ? (
                        <div className="bg-slate-800/50 border border-dashed border-slate-700 p-12 rounded-[2.5rem] text-center">
                            <span className="material-icons text-5xl text-slate-700 mb-4">local_shipping</span>
                            <p className="text-slate-500 font-bold">No jobs assigned yet.</p>
                            <p className="text-slate-600 text-xs mt-1">Assignments will appear here in real-time.</p>
                        </div>
                    ) : (
                        activeJobs.map(job => (
                            <div key={job.id} className="bg-slate-800 rounded-[2.5rem] p-6 border border-slate-700 shadow-xl">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                            job.status === 'assigned' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                                        )}>
                                            {job.status.replace('_', ' ')}
                                        </span>
                                        <p className="text-lg font-black mt-2">Order #{job.tracking_number || job.order_id.substring(0, 8)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Fee</p>
                                        <p className="text-lg font-black text-orange-500">{formatCurrency(job.delivery_fee)}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                                            <div className="w-px flex-1 bg-slate-700 border-dashed border-l my-1"></div>
                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Pickup</p>
                                                <p className="text-sm font-bold text-slate-300">Vendor Warehouse - Hub A</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Delivery Address</p>
                                                <p className="text-sm font-bold text-white">123 Street, Apartment 4B</p>
                                                <p className="text-[10px] text-slate-500">Nairobi, Kenya</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            // Use mock coordinates for now, ideally from job.delivery_lat/lng
                                            const lat = -1.2864; // Nairobi coords
                                            const lng = 36.8172;
                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                                            window.open(url, '_blank');
                                        }}
                                        className="flex-1 h-14 bg-slate-700 rounded-2xl flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition"
                                    >
                                        <span className="material-icons text-lg">navigation</span>
                                        Navigate
                                    </button>
                                    <button
                                        onClick={() => initiateDelivery(job.id)}
                                        className="flex-[1.5] h-14 bg-orange-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition disabled:opacity-50"
                                    >
                                        <span className="material-icons text-lg">check_circle</span>
                                        Delivered
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Map Zone / Zones Info */}
            <div className="px-6 mt-12 pb-10">
                <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-700 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-700 flex items-center justify-center text-orange-500">
                        <span className="material-icons text-3xl">explore</span>
                    </div>
                    <div>
                        <p className="text-sm font-black">Active Delivery Zone</p>
                        <p className="text-xs text-slate-500">Nairobi West, Upper Hill, CBD</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
