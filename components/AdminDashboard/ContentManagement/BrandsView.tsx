import React, { useEffect, useState } from 'react';
import type { AdminPermissions } from '@/types';
import GenericDataTable, { ColumnConfig } from './Shared/GenericDataTable';
import { fetchTableData } from '@/lib/api';

interface BrandsViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const BrandsView: React.FC<BrandsViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        // Table: admin_2025_shopify_brands
        const result = await fetchTableData('admin_2025_shopify_brands', '*', 'name', true);
        setData(result);
        setIsLoading(false);
    };

    const columns: ColumnConfig[] = [
        { key: 'id', label: 'ID' },
        {
            key: 'name',
            label: 'Brand Name',
            render: (value) => <span className="font-medium text-blue-900">{value}</span>
        },
        { key: 'slug', label: 'Slug' },
        {
            key: 'logo_url',
            label: 'Logo',
            render: (value) => value ? (
                <img src={value} alt="Brand Logo" className="h-8 w-auto object-contain" />
            ) : <span className="text-gray-400 text-xs">No Logo</span>
        },
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
        return <div className="text-red-500">You do not have permission to view Brands.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Brands</h3>
                <span className="text-sm text-gray-500">Source: admin_2025_shopify_brands</span>
            </div>
            <GenericDataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No brands found. Import a JSON snapshot to populate."
            />
        </div>
    );
};

export default BrandsView;
