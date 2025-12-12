import React, { useEffect, useState } from 'react';
import type { AdminPermissions } from '@/types';
import GenericDataTable, { ColumnConfig } from './Shared/GenericDataTable';
import { fetchTableData } from '@/lib/api';

interface VerticalsViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const VerticalsView: React.FC<VerticalsViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        // Table: shopify_verticals
        const result = await fetchTableData('shopify_verticals', '*', 'name', true);
        setData(result);
        setIsLoading(false);
    };

    const columns: ColumnConfig[] = [
        { key: 'id', label: 'ID' },
        {
            key: 'name',
            label: 'Vertical Name',
            render: (value) => <span className="font-medium text-gray-900">{value}</span>
        },
        { key: 'slug', label: 'Slug' },
        {
            key: 'is_active',
            label: 'Status',
            render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {value ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    if (permissions?.permissions?.content?.read === false) {
        return <div className="text-red-500">You do not have permission to view Verticals.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Verticals</h3>
                <span className="text-sm text-gray-500">Source: shopify_verticals</span>
            </div>
            <GenericDataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No verticals found. Import a JSON snapshot to populate."
            />
        </div>
    );
};

export default VerticalsView;
