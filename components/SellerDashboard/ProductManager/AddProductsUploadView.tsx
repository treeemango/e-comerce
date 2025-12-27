
import React, { useState, useRef } from 'react';
import { CSVParser, ParsedRow } from '../../../lib/csv-parser';
import { createProductsBulk } from '../../../lib/api';
import { CreateProductPayload } from '../../../types';

interface AddProductsUploadViewProps {
    sellerId: string;
}

const AddProductsUploadView: React.FC<AddProductsUploadViewProps> = ({ sellerId }) => {
    const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download');
    const [category, setCategory] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        success: string[];
        failed: { index: number; error: string }[];
    } | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);
        setProgress({ current: 0, total: 0 });

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            try {
                const delimiter = CSVParser.detectDelimiter(content);
                const result = CSVParser.parse(content, delimiter);

                if (result.errors.length > 0) {
                    alert('Errors in CSV: ' + result.errors.join(', '));
                    setIsUploading(false);
                    return;
                }

                // Map CSV rows to CreateProductPayload
                // Expected CSV headers: title, description, category_id, price, currency, stock, sku, image_url
                const productsToCreate = result.data.map((row: ParsedRow, index: number) => {
                    const payload: CreateProductPayload = {
                        title: row['title'] || `Product ${index + 1}`,
                        description: row['description'] || '',
                        category_id: row['category_id'] || '',
                        currency: row['currency'] || 'USD',
                        condition: (row['condition'] as any) || 'new',
                        attributes: [],
                        variants: [{
                            sku: row['sku'] || '',
                            price: parseFloat(row['price'] || '0'),
                            stock: parseInt(row['stock'] || '0'),
                            options: {},
                            is_default: true,
                            image_url: row['image_url'] || ''
                        }],
                        media: row['image_url'] ? [{
                            url: row['image_url'],
                            storage_path: '',
                            media_type: 'image',
                            is_main: true,
                            position: 0
                        }] : []
                    };

                    return {
                        payload,
                        variants: payload.variants,
                        media: payload.media,
                        attributes: payload.attributes
                    };
                });

                if (productsToCreate.length === 0) {
                    alert('No valid products found in CSV.');
                    setIsUploading(false);
                    return;
                }

                const results = await createProductsBulk(sellerId, productsToCreate, (curr, tot) => {
                    setProgress({ current: curr, total: tot });
                });

                setUploadStatus(results);
            } catch (error: any) {
                alert('Failed to parse or upload CSV: ' + error.message);
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Add products via upload</h1>
                    <a href="#" className="text-orange-500 hover:text-orange-600 text-sm font-medium hover:underline">
                        How to add product in bulk
                    </a>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('download')}
                        className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'download' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Download spreadsheet
                        {activeTab === 'download' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'upload' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Upload your spreadsheet
                        {activeTab === 'upload' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white p-8 min-h-[400px] border border-gray-200 rounded-xl">
                {activeTab === 'download' && (
                    <div className="max-w-4xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Download spreadsheet</h2>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Please enter category"
                                    className="w-full border border-gray-300 rounded px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                />
                                <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">expand_more</span>
                            </div>
                        </div>

                        <div className="flex justify-center mt-12">
                            <button className="bg-orange-500 text-white px-12 py-2.5 rounded font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                                Generate spreadsheet
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="max-w-4xl mx-auto text-center py-12">
                        {isUploading ? (
                            <div className="space-y-6">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                                <h3 className="text-lg font-medium text-gray-900">Uploading products...</h3>
                                <p className="text-sm text-gray-500">
                                    Progress: {progress.current} / {progress.total}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
                                    <div
                                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : uploadStatus ? (
                            <div className="space-y-6">
                                <div className={`inline-flex items-center justify-center p-3 rounded-full ${uploadStatus.failed.length === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                    <span className={`material-icons ${uploadStatus.failed.length === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {uploadStatus.failed.length === 0 ? 'check_circle' : 'warning'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Upload Complete</h3>
                                <div className="text-sm text-gray-600">
                                    <p className="text-green-600 font-bold">Successfully created: {uploadStatus.success.length}</p>
                                    <p className="text-red-600 font-bold">Failed: {uploadStatus.failed.length}</p>
                                </div>
                                {uploadStatus.failed.length > 0 && (
                                    <div className="text-left bg-red-50 p-4 rounded-lg max-h-40 overflow-y-auto max-w-2xl mx-auto">
                                        <p className="text-xs font-bold text-red-700 mb-2">Errors:</p>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {uploadStatus.failed.map((f, i) => (
                                                <li key={i}>Row {f.index + 1}: {f.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button
                                    onClick={() => setUploadStatus(null)}
                                    className="bg-orange-500 text-white px-8 py-2 rounded font-bold hover:bg-orange-600"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-12 hover:bg-gray-100 transition-colors cursor-pointer inline-block w-full max-w-2xl group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".csv,.tsv"
                                    className="hidden"
                                />
                                <span className="material-icons text-5xl text-gray-400 mb-4 group-hover:text-orange-500 transition-colors">cloud_upload</span>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Drag and drop your spreadsheet here</h3>
                                <p className="text-sm text-gray-500 mb-6">Supported formats: .csv, .tsv</p>
                                <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-50">
                                    Select File
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddProductsUploadView;

