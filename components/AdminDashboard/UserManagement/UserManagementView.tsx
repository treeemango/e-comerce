import React, { useEffect, useState } from 'react';
import { fetchAllUsers, hasResourcePermission, setUserBanStatus } from '@/lib/api';
import type { User, AdminPermissions } from '@/types';

interface UserManagementViewProps {
    permissions?: AdminPermissions;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ permissions }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [actionUserId, setActionUserId] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, [roleFilter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchAllUsers(roleFilter ? { role: roleFilter } : {});
            setUsers(data);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const canEdit = hasResourcePermission(permissions?.permissions, 'users', 'update');
    const canBan = hasResourcePermission(permissions?.permissions, 'users', 'delete') ||
        hasResourcePermission(permissions?.permissions, 'users', 'manage');

    const isUserBanned = (user: User) => {
        if (user.account_status === 'banned') return true;
        if (!user.banned_until) return false;
        const bannedUntilMs = Date.parse(user.banned_until);
        return Number.isFinite(bannedUntilMs) && bannedUntilMs > Date.now();
    };

    const handleToggleBan = async (user: User) => {
        if (!canBan) return;
        if (actionUserId) return;

        const nextBanned = !isUserBanned(user);
        try {
            setActionUserId(user.id);
            const updated = await setUserBanStatus(user.id, nextBanned);
            if (!updated) {
                window.alert('Failed to update user status. Check console for details.');
                return;
            }
            await loadUsers();
        } catch (e) {
            console.error('Error toggling ban:', e);
            window.alert('Failed to update user status. Check console for details.');
        } finally {
            setActionUserId(null);
        }
    };

    const filteredUsers = users.filter(user =>
    (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getRoleBadgeColor = (role: string | undefined) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'seller': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <div className="flex gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All Roles</option>
                        <option value="user">Buyers</option>
                        <option value="seller">Sellers</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    {user.avatar_url && user.avatar_url.trim() !== '' ? (
                                                        <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                                                    ) : (
                                                        <span className="text-gray-500 font-bold text-sm">
                                                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name || 'No Name'}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isUserBanned(user) ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Banned
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {canEdit && (
                                                <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                            )}
                                            {canBan && (
                                                <button
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    disabled={actionUserId === user.id}
                                                    onClick={() => handleToggleBan(user)}
                                                >
                                                    {actionUserId === user.id
                                                        ? 'Updating...'
                                                        : (isUserBanned(user) ? 'Unban' : 'Ban')}
                                                </button>
                                            )}
                                            {!canEdit && !canBan && (
                                                <span className="text-gray-400 text-xs text-center block">Read Only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagementView;
