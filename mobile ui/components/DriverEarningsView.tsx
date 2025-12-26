
import React, { useState } from 'react';
import { formatCurrency } from '../../lib/utils';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DriverEarningsViewProps {
    onBack: () => void;
    // Mock data for now, ideally fetched from API
}

const DriverEarningsView: React.FC<DriverEarningsViewProps> = ({ onBack }) => {
    const [timeRange, setTimeRange] = useState<'today' | 'week'>('today');

    // Mock data
    const earnings = {
        total: 12500,
        target: 20000,
        base: 10500,
        tips: 1500,
        bonus: 500,
        history: [
            { day: 'Mon', amount: 2500 },
            { day: 'Tue', amount: 3200 },
            { day: 'Wed', amount: 1800 },
            { day: 'Thu', amount: 4100 },
            { day: 'Fri', amount: 900 }
        ]
    };

    const progress = (earnings.total / earnings.target) * 100;

    return (
        <div className="bg-gray-950 min-h-screen pb-24">
            {/* Premium Header */}
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-6 pt-14 pb-14 rounded-b-[3rem] relative overflow-hidden border-b border-gray-800/50">
                {/* Gradient glow orbs */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px]"></div>

                <div className="flex items-center gap-4 relative z-10 mb-8">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 rounded-2xl bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-white border border-gray-700/50 active:scale-90 transition-transform"
                    >
                        <span className="material-icons-round">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Earnings</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Performance Overview</p>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">Total Earnings ({timeRange === 'today' ? 'Today' : 'This Week'})</p>
                    <h2 className="text-5xl font-black text-white mb-8 tracking-tight">{formatCurrency(earnings.total)}</h2>

                    {/* Progress Bar */}
                    <div className="bg-gray-800/60 backdrop-blur-md rounded-3xl p-5 border border-gray-700/50">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                            <span>Goal Progress</span>
                            <span className="text-primary">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-primary/30"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-medium">
                            <span>{formatCurrency(0)}</span>
                            <span>Goal: {formatCurrency(earnings.target)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Breakdown Cards */}
            <div className="px-6 -mt-6 grid grid-cols-3 gap-3 relative z-20">
                {[
                    { icon: 'local_shipping', label: 'Base', amount: earnings.base, color: 'bg-blue-500', glow: 'shadow-blue-500/30' },
                    { icon: 'attach_money', label: 'Tips', amount: earnings.tips, color: 'bg-emerald-500', glow: 'shadow-emerald-500/30' },
                    { icon: 'auto_graph', label: 'Bonus', amount: earnings.bonus, color: 'bg-purple-500', glow: 'shadow-purple-500/30' },
                ].map((item, idx) => (
                    <div key={idx} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex flex-col items-center">
                        <span className={`w-10 h-10 rounded-2xl ${item.color} ${item.glow} shadow-lg flex items-center justify-center mb-3`}>
                            <span className="material-icons-round text-white text-sm">{item.icon}</span>
                        </span>
                        <p className="text-[9px] uppercase font-black text-gray-500 tracking-widest">{item.label}</p>
                        <p className="font-black text-white text-lg">{formatCurrency(item.amount)}</p>
                    </div>
                ))}
            </div>

            {/* Chart Section */}
            <div className="px-6 mt-8">
                <h3 className="font-black text-white mb-4 text-lg tracking-tight">Weekly Trend</h3>
                <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={earnings.history}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 'bold' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: '1px solid #374151',
                                    boxShadow: '0 10px 40px rgb(0 0 0 / 0.3)',
                                    backgroundColor: '#1f2937',
                                    color: '#fff'
                                }}
                            />
                            <Bar
                                dataKey="amount"
                                fill="url(#barGradient)"
                                radius={[8, 8, 8, 8]}
                                barSize={24}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="100%" stopColor="#ea580c" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DriverEarningsView;
