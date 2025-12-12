import React, { useEffect, useState } from 'react';
import type { AdminPermissions } from '@/types';
import GenericDataTable, { ColumnConfig } from './Shared/GenericDataTable';
import { fetchTableData } from '@/lib/api';

interface CarouselsViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const CarouselsView: React.FC<CarouselsViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        // Table: admin_2025_category_carousels
        const result = await fetchTableData('admin_2025_category_carousels', '*', 'display_order', true);
        setData(result);
        setIsLoading(false);
    };

    const columns: ColumnConfig[] = [
        { key: 'id', label: 'ID' },
        {
            key: 'title',
            label: 'Title',
            render: (value) => <span className="font-medium text-gray-900">{value}</span>
        },
        { key: 'category_id', label: 'Category ID' },
        { key: 'display_order', label: 'Order' },
        {
            key: 'image_url',
            label: 'Preview',
            render: (value) => value ? (
                <img src={value} alt="Carousel" className="h-10 w-20 object-cover rounded" />
            ) : <span className="text-gray-400 text-xs">No Image</span>
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
        return <div className="text-red-500">You do not have permission to view Carousels.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Category Carousels</h3>
                <span className="text-sm text-gray-500">Source: admin_2025_category_carousels</span>
            </div>
            <GenericDataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No carousels found. Import a JSON snapshot to populate."
            />
        </div>
    );
};

export default CarouselsView;
