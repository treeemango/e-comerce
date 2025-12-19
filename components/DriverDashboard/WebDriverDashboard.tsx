import React, { useEffect, useState } from 'react';
import { fetchActiveDeliveryJobs, markOrderDelivered } from '@/lib/api';
import { DeliveryAssignment } from '@/types';
import { supabase } from '@/lib/supabase';

interface WebDriverDashboardProps {
    partnerId: string;
}

const WebDriverDashboard: React.FC<WebDriverDashboardProps> = ({ partnerId }) => {
    const [jobs, setJobs] = useState<DeliveryAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

    useEffect(() => {
        const loadJobs = async () => {
            setLoading(true);
            try {
                const data = await fetchActiveDeliveryJobs(partnerId);
                setJobs(data);
            } catch (error) {
                console.error('Error loading jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadJobs();

        // Real-time subscription
        const subscription = supabase
            .channel(`driver_jobs_${partnerId}`)
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

    const handleMarkDelivered = async (orderId: string) => {
        if (!window.confirm('Mark this order as delivered?')) return;

        try {
            const success = await markOrderDelivered(orderId);
            if (success) {
                setJobs(prev => prev.filter(j => j.order_id !== orderId));
            } else {
                alert('Action failed: Could not mark as delivered.');
            }
        } catch (error) {
            console.error('Error marking delivered:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Tasks', value: jobs.length, icon: 'local_shipping', color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Today Revenue', value: '£42.50', icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Completion Rate', value: '98%', icon: 'verified', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Rating', value: '4.9', icon: 'star', color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <span className="material-icons">{stat.icon}</span>
                            </div>
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Live</span>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Split Screen Concept */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Jobs List */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Assignments</h2>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('current')}
                                className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'current' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
                            >
                                Current
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
                            >
                                Completed
                            </button>
                        </div>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-200 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons text-slate-300 text-3xl">inbox</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No active jobs</h3>
                            <p className="text-slate-500 text-sm mt-1">You're all caught up! New orders will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {jobs.map((job) => (
                                <div key={job.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                    <div className="p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                                                    <span className="material-icons">inventory_2</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Order #{job.order_number || job.order_id.substring(0, 8)}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest">{job.status}</span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Express Delivery</h4>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                                    <span className="material-icons">map</span>
                                                </button>
                                                <button className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                                    <span className="material-icons">call</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</p>
                                                <p className="font-bold text-slate-900">John M. Doe</p>
                                                <p className="text-sm text-slate-500">+254 701 234 567</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Address</p>
                                                <p className="font-bold text-slate-900">Riverside Drive, Nairobi</p>
                                                <p className="text-sm text-slate-500">Apt 4B, Building C</p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <span className="material-icons text-sm">schedule</span>
                                                <span className="text-xs font-black uppercase tracking-widest">Priority Delivery</span>
                                            </div>
                                            <button
                                                onClick={() => handleMarkDelivered(job.order_id)}
                                                className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                            >
                                                Complete Delivery
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Context */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Live Map Placeholder */}
                    <div className="bg-slate-900 rounded-2xl aspect-[4/5] relative overflow-hidden group border-4 border-white shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-50"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center mb-6 border border-white/20">
                                <span className="material-icons text-white text-4xl animate-bounce">location_on</span>
                            </div>
                            <h3 className="text-white font-black text-lg tracking-tight">Interactive Map</h3>
                            <p className="text-slate-400 text-sm mt-2 font-medium">Map integration ready for Google Maps API or Leaflet.js</p>
                            <button className="mt-8 px-6 py-3 bg-white text-slate-900 font-black rounded-xl hover:bg-orange-500 hover:text-white transition-all">
                                Open Full Map
                            </button>
                        </div>
                        {/* Mock Map Lines */}
                        <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none">
                            <div className="w-full h-1 bg-white absolute top-10 rotate-12"></div>
                            <div className="w-full h-1 bg-white absolute top-20 -rotate-12"></div>
                            <div className="h-full w-1 bg-white absolute left-20 rotate-45"></div>
                        </div>
                    </div>

                    {/* Performance Insight */}
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 text-white shadow-2xl shadow-orange-500/30">
                        <div className="flex items-center justify-between mb-6">
                            <span className="material-icons text-3xl">insights</span>
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Peak Hour</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">Dynamic Pricing Active</h3>
                        <p className="text-orange-100 text-sm mt-2 font-medium">Earn +£2.00 extra per delivery in Central Nairobi until 8:00 PM.</p>
                        <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Daily Goal</p>
                                <p className="text-lg font-black tracking-tighter">75% Reached</p>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center">
                                <span className="text-[10px] font-black">75%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebDriverDashboard;
