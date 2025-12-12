import React, { useEffect, useState } from 'react';
import { fetchAdminDashboardStats, hasResourcePermission } from '@/lib/api';
import type { AdminDashboardStats, AdminPermissions } from '@/types';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: string;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    {trend && (
                        <div className="flex items-center mt-2 text-sm">
                            <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'} mr-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}></i>
                            <span className={trend.isPositive ? 'text-green-500' : 'text-red-500'}>
                                {trend.value}
                            </span>
                            <span className="text-gray-600 ml-2">from last month</span>
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <i className={`${icon} text-xl`}></i>
                </div>
            </div>
        </div>
    );
};

interface DashboardOverviewProps {
    permissions?: AdminPermissions;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ permissions }) => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminDashboardStats();
            console.log('Admin Dashboard Stats Response:', data);
            setStats(data);
            setError(null);
        } catch (err) {
            console.error('Error loading admin stats:', err);
            setError('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    const canApproveProducts = hasResourcePermission(permissions?.permissions, 'products', 'approve');
    const canVerifySellers = hasResourcePermission(permissions?.permissions, 'sellers', 'verify');
    const canManageUsers = hasResourcePermission(permissions?.permissions, 'users', 'read');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-2"></i>
                <p className="text-red-700">{error}</p>
                <button
                    onClick={loadStats}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Users"
                    value={stats?.total_users || 0}
                    icon="fas fa-users"
                    color="blue"
                    trend={{ value: '+12%', isPositive: true }}
                />
                <StatsCard
                    title="Total Sellers"
                    value={stats?.total_sellers || 0}
                    icon="fas fa-store"
                    color="green"
                    trend={{ value: '+8%', isPositive: true }}
                />
                <StatsCard
                    title="Pending Approvals"
                    value={stats?.pending_product_approvals || 0}
                    icon="fas fa-clock"
                    color="yellow"
                />
                <StatsCard
                    title="Pending Verifications"
                    value={stats?.pending_seller_verifications || 0}
                    icon="fas fa-user-check"
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Orders"
                    value={stats?.total_orders || 0}
                    icon="fas fa-shopping-cart"
                    color="blue"
                />
                <StatsCard
                    title="Total Revenue"
                    value={`$${(stats?.total_revenue || 0).toLocaleString()}`}
                    icon="fas fa-dollar-sign"
                    color="green"
                    trend={{ value: '+24%', isPositive: true }}
                />
                <StatsCard
                    title="Active Disputes"
                    value={stats?.active_disputes || 0}
                    icon="fas fa-exclamation-circle"
                    color="red"
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        disabled={!canApproveProducts}
                        className={`p-4 rounded-lg transition-colors duration-200 text-left ${canApproveProducts ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${canApproveProducts ? 'bg-blue-100' : 'bg-gray-200'
                                }`}>
                                <i className={`fas fa-check-circle text-lg ${canApproveProducts ? 'text-blue-600' : 'text-gray-400'
                                    }`}></i>
                            </span>
                            <div>
                                <p className={`text-sm font-semibold ${canApproveProducts ? 'text-gray-900' : 'text-gray-500'}`}>Approve Products</p>
                                <p className="text-xs text-gray-600 mt-1">Review pending product submissions</p>
                            </div>
                        </div>
                    </button>
                    <button
                        disabled={!canVerifySellers}
                        className={`p-4 rounded-lg transition-colors duration-200 text-left ${canVerifySellers ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${canVerifySellers ? 'bg-green-100' : 'bg-gray-200'
                                }`}>
                                <i className={`fas fa-user-check text-lg ${canVerifySellers ? 'text-green-600' : 'text-gray-400'
                                    }`}></i>
                            </span>
                            <div>
                                <p className={`text-sm font-semibold ${canVerifySellers ? 'text-gray-900' : 'text-gray-500'}`}>Verify Sellers</p>
                                <p className="text-xs text-gray-600 mt-1">Review seller verification requests</p>
                            </div>
                        </div>
                    </button>
                    <button
                        disabled={!canManageUsers}
                        className={`p-4 rounded-lg transition-colors duration-200 text-left ${canManageUsers ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${canManageUsers ? 'bg-purple-100' : 'bg-gray-200'
                                }`}>
                                <i className={`fas fa-users text-lg ${canManageUsers ? 'text-purple-600' : 'text-gray-400'
                                    }`}></i>
                            </span>
                            <div>
                                <p className={`text-sm font-semibold ${canManageUsers ? 'text-gray-900' : 'text-gray-500'}`}>Manage Users</p>
                                <p className="text-xs text-gray-600 mt-1">View and manage user accounts</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    <div className="text-center text-gray-500 py-8">
                        <i className="fas fa-history text-3xl mb-2"></i>
                        <p className="font-medium">Activity Log Coming Soon</p>
                        <p className="text-sm mt-2">Recent admin actions will be displayed here</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
