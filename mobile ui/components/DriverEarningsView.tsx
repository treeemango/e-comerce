
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
        <div className="bg-slate-50 min-h-screen pb-24">
            {/* Header */}
            <div className="bg-slate-900 px-6 pt-16 pb-12 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10 mb-8">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition"
                    >
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-black text-white">Earnings</h1>
                </div>

                <div className="relative z-10">
                    <p className="text-slate-400 font-medium mb-1">Total Earnings ({timeRange === 'today' ? 'Today' : 'This Week'})</p>
                    <h2 className="text-4xl font-black text-white mb-6">{formatCurrency(earnings.total)}</h2>

                    {/* Progress Bar */}
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            <span>Goal Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span>{formatCurrency(0)}</span>
                            <span>Goal: {formatCurrency(earnings.target)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="px-6 -mt-6 grid grid-cols-3 gap-3 relative z-20">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                        <span className="material-icons text-sm">local_shipping</span>
                    </span>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Base</p>
                    <p className="font-bold text-slate-900">{formatCurrency(earnings.base)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                        <span className="material-icons text-sm">attach_money</span>
                    </span>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tips</p>
                    <p className="font-bold text-slate-900">{formatCurrency(earnings.tips)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                        <span className="material-icons text-sm">auto_graph</span>
                    </span>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Bonus</p>
                    <p className="font-bold text-slate-900">{formatCurrency(earnings.bonus)}</p>
                </div>
            </div>

            {/* Chart Section */}
            <div className="px-6 mt-8">
                <h3 className="font-bold text-slate-900 mb-4 text-lg">Weekly Trend</h3>
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={earnings.history}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="amount"
                                fill="#f97316"
                                radius={[4, 4, 4, 4]}
                                barSize={20}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DriverEarningsView;
