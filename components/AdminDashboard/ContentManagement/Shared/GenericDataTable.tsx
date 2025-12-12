import React from 'react';

export interface ColumnConfig {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
}

interface GenericDataTableProps {
    data: any[];
    columns: ColumnConfig[];
    isLoading: boolean;
    emptyMessage?: string;
}

const GenericDataTable: React.FC<GenericDataTableProps> = ({
    data,
    columns,
    isLoading,
    emptyMessage = 'No data available'
}) => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                <i className="fas fa-inbox text-4xl mb-4 text-gray-300"></i>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    // Safely access nested properties (e.g., 'category.name')
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item, rowIndex) => (
                            <tr key={item.id || rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col) => {
                                    const value = getNestedValue(item, col.key);
                                    return (
                                        <td key={`${item.id}-${col.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {col.render ? col.render(value, item) : (value?.toString() || '-')}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                <span>Showing {data.length} records</span>
            </div>
        </div>
    );
};

export default GenericDataTable;
