import React, { useEffect, useState } from 'react';
import { fetchAdminActivityLog } from '@/lib/api';
import type { AdminActivityLog } from '@/types';

const ActivityLogView: React.FC = () => {
    const [logs, setLogs] = useState<AdminActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminActivityLog(50);
            setLogs(data);
        } catch (err) {
            console.error('Error loading activity logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        if (action.includes('APPROVE')) return 'fas fa-check-circle text-green-500';
        if (action.includes('REJECT')) return 'fas fa-times-circle text-red-500';
        if (action.includes('CREATE')) return 'fas fa-plus-circle text-blue-500';
        if (action.includes('UPDATE')) return 'fas fa-edit text-yellow-500';
        if (action.includes('DELETE')) return 'fas fa-trash text-gray-500';
        return 'fas fa-info-circle text-gray-500';
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
                <button
                    onClick={loadLogs}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <i className="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                        Loading activity logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        No activity logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{log.admin_name}</div>
                                            <div className="text-xs text-gray-400">ID: {log.admin_id.substring(0, 8)}...</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="flex items-center gap-2">
                                                <i className={getActionIcon(log.action)}></i>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {formatAction(log.action)}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {log.resource_type.toUpperCase()}
                                            </span>
                                            {log.resource_id && (
                                                <div className="text-xs text-gray-400 mt-1">ID: {log.resource_id.substring(0, 8)}...</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {JSON.stringify(log.details || {})}
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

export default ActivityLogView;
