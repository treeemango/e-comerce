import React, { useRef, useState } from 'react';
import { exportAdminJson, importAdminJson } from '@/lib/api';

interface JsonWorkflowPanelProps {
    onRefreshRequest: () => void;
}

const JsonWorkflowPanel: React.FC<JsonWorkflowPanelProps> = ({ onRefreshRequest }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setStatusMessage(null);
        try {
            const data = await exportAdminJson();
            if (data && data.length > 0) {
                // Create downloadable BLOB
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `admin_taxonomy_snapshot_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatusMessage({ type: 'success', text: `Exported ${data.length} records successfully.` });
            } else {
                setStatusMessage({ type: 'error', text: 'Export returned empty data.' });
            }
        } catch (error) {
            console.error('Export failed:', error);
            setStatusMessage({ type: 'error', text: 'Failed to export JSON data.' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setStatusMessage({ type: 'info', text: 'Reading and importing file...' });

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);

            if (!Array.isArray(jsonData)) {
                throw new Error('Invalid JSON format: Root must be an array.');
            }

            const result = await importAdminJson(jsonData);

            if (result.success) {
                setStatusMessage({
                    type: 'success',
                    text: `Import successful! ${result.message || ''}`
                });
                onRefreshRequest(); // Refresh the table views
            } else {
                setStatusMessage({ type: 'error', text: `Import failed: ${result.message}` });
            }
        } catch (error: any) {
            console.error('Import error:', error);
            setStatusMessage({ type: 'error', text: `Import error: ${error.message}` });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <section className="bg-white shadow-sm rounded-lg mb-6 border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <i className="fas fa-code-branch text-blue-600"></i>
                    JSON Workflow
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Export the latest snapshot, edit it collaboratively (e.g. in VS Code), then import to sync changes.
                </p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isExporting || isImporting}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isExporting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-download mr-2"></i>}
                        Export JSON
                    </button>

                    <button
                        onClick={() => alert('Gap Analysis Report feature coming soon')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <i className="fas fa-chart-pie mr-2"></i>
                        Gap Analysis
                    </button>

                    <button
                        onClick={handleImportClick}
                        disabled={isExporting || isImporting}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isImporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isImporting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-upload mr-2"></i>}
                        Import JSON
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/json"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        onClick={onRefreshRequest}
                        className="ml-auto text-gray-400 hover:text-blue-600 transition-colors"
                        title="Refresh Data"
                    >
                        <i className="fas fa-sync-alt text-lg"></i>
                    </button>
                </div>

                {/* Status Message */}
                {statusMessage && (
                    <div className={`p-4 rounded-md ${statusMessage.type === 'success' ? 'bg-green-50 text-green-800' :
                            statusMessage.type === 'error' ? 'bg-red-50 text-red-800' :
                                'bg-blue-50 text-blue-800'
                        }`}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {statusMessage.type === 'success' && <i className="fas fa-check-circle"></i>}
                                {statusMessage.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
                                {statusMessage.type === 'info' && <i className="fas fa-info-circle"></i>}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{statusMessage.text}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default JsonWorkflowPanel;
