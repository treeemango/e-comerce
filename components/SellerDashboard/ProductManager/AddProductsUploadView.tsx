
import React, { useState } from 'react';

const AddProductsUploadView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download');
    const [category, setCategory] = useState('');

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
            <div className="bg-white p-8 min-h-[400px]">
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-12 hover:bg-gray-100 transition-colors cursor-pointer inline-block w-full max-w-2xl">
                            <span className="material-icons text-5xl text-gray-400 mb-4">cloud_upload</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Drag and drop your spreadsheet here</h3>
                            <p className="text-sm text-gray-500 mb-6">Supported formats: .xlsx, .xls, .csv</p>
                            <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-50">
                                Select File
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddProductsUploadView;
