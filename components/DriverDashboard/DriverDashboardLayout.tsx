import React, { useState } from 'react';

interface DriverDashboardLayoutProps {
    children: React.ReactNode;
    activeTab: 'jobs' | 'earnings' | 'vehicles' | 'profile';
    onTabChange: (tab: 'jobs' | 'earnings' | 'vehicles' | 'profile') => void;
    user: any;
    onSignOut: () => void;
}

const DriverDashboardLayout: React.FC<DriverDashboardLayoutProps> = ({ children, activeTab, onTabChange, user, onSignOut }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuItems = [
        { id: 'jobs', label: 'Active Jobs', icon: 'local_shipping' },
        { id: 'earnings', label: 'My Earnings', icon: 'payments' },
        { id: 'vehicles', label: 'Vehicles', icon: 'minor_crash' },
        { id: 'profile', label: 'Profile Settings', icon: 'person' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-display">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 transition-all duration-300 flex flex-col fixed inset-y-0 z-20`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                            <span className="material-icons text-white text-lg font-bold">local_shipping</span>
                        </div>
                        {isSidebarOpen && (
                            <div className="whitespace-nowrap">
                                <span className="text-white font-black text-sm tracking-tight">Driver</span>
                                <span className="text-orange-500 font-black text-sm tracking-tight text-xs block -mt-1">PORTAL</span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id as any)}
                            className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <span className={`material-icons ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-orange-400 font-bold'}`}>
                                {item.icon}
                            </span>
                            {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-4 px-3 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all group"
                    >
                        <span className="material-icons group-hover:text-red-400 font-bold">logout</span>
                        {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`${isSidebarOpen ? 'ml-64' : 'ml-20'} flex-1 transition-all duration-300`}>
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                        >
                            <span className="material-icons">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
                        </button>
                        <h1 className="text-xl font-black text-slate-900 capitalize tracking-tight">{activeTab}</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-black uppercase tracking-widest">Active Duty</span>
                        </div>

                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 leading-none">{user?.name || 'Driver'}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {user?.id?.substring(0, 8)}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-icons text-slate-400">person</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DriverDashboardLayout;
