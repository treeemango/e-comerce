import React, { useEffect, useState } from 'react';
import type { AdminPermissions } from '@/types';
import GenericDataTable, { ColumnConfig } from './Shared/GenericDataTable';
import { fetchTableData } from '@/lib/api';

interface CategoriesViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        // Table: shopify_categories
        // Note: Joining vertical name would be nice but simple table select is safer for now.
        // We can add join logic to fetchTableData later or use a specific RPC if needed.
        const result = await fetchTableData('shopify_categories', '*', 'name', true);
        setData(result);
        setIsLoading(false);
    };

    const columns: ColumnConfig[] = [
        { key: 'id', label: 'ID' },
        {
            key: 'name',
            label: 'Category Name',
            render: (value) => <span className="font-medium text-gray-900">{value}</span>
        },
        { key: 'slug', label: 'Slug' },
        { key: 'parent_id', label: 'Parent ID' },
        { key: 'vertical_id', label: 'Vertical ID' },
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
        return <div className="text-red-500">You do not have permission to view Categories.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Categories</h3>
                <span className="text-sm text-gray-500">Source: shopify_categories</span>
            </div>
            <GenericDataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No categories found. Import a JSON snapshot to populate."
            />
        </div>
    );
};

export default CategoriesView;
