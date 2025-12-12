import React, { useEffect, useState } from 'react';
import type { AdminPermissions } from '@/types';
import GenericDataTable, { ColumnConfig } from './Shared/GenericDataTable';
import { fetchTableData } from '@/lib/api';

interface AttributesViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const AttributesView: React.FC<AttributesViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        // Table: shopify_attributes
        const result = await fetchTableData('shopify_attributes', '*', 'name', true);
        setData(result);
        setIsLoading(false);
    };

    const columns: ColumnConfig[] = [
        { key: 'id', label: 'ID' },
        {
            key: 'name',
            label: 'Attribute Name',
            render: (value) => <span className="font-medium text-gray-900">{value}</span>
        },
        { key: 'type', label: 'Type' },
        {
            key: 'options',
            label: 'Options',
            render: (value) => {
                if (Array.isArray(value)) {
                    return <span className="text-xs text-gray-500">{value.join(', ')}</span>;
                }
                return <span className="text-xs text-gray-400">-</span>;
            }
        },
        { key: 'category_id', label: 'Category ID' }
    ];

    if (permissions?.permissions?.content?.read === false) {
        return <div className="text-red-500">You do not have permission to view Attributes.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Attributes</h3>
                <span className="text-sm text-gray-500">Source: shopify_attributes</span>
            </div>
            <GenericDataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No attributes found. Import a JSON snapshot to populate."
            />
        </div>
    );
};

export default AttributesView;
