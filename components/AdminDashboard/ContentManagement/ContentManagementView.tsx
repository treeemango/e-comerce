import React, { useState } from 'react';
import VerticalsView from './VerticalsView';
import CategoriesView from './CategoriesView';
import BrandsView from './BrandsView';
import AttributesView from './AttributesView';
import CarouselsView from './CarouselsView';
import HeroSlidesView from './HeroSlidesView';
import JsonWorkflowPanel from './JsonWorkflowPanel';
import type { AdminPermissions } from '@/types';

interface ContentManagementViewProps {
    permissions?: AdminPermissions;
}

const ContentManagementView: React.FC<ContentManagementViewProps> = ({ permissions }) => {
    const [activeTab, setActiveTab] = useState('hero-slides');
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Added state

    const handleRefreshRequest = () => { // Added function
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>

            {/* JSON Workflow Panel (Global Import/Export) */}
            <JsonWorkflowPanel onRefreshRequest={handleRefreshRequest} />

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                {['hero-slides', 'verticals', 'categories', 'brands', 'attributes', 'carousels'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 border-b-2 font-medium capitalize whitespace-nowrap ${activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                {activeTab === 'hero-slides' && <HeroSlidesView permissions={permissions} refreshTrigger={refreshTrigger} />}
                {activeTab === 'verticals' && <VerticalsView permissions={permissions} refreshTrigger={refreshTrigger} />}
                {activeTab === 'categories' && <CategoriesView permissions={permissions} refreshTrigger={refreshTrigger} />}
                {activeTab === 'brands' && <BrandsView permissions={permissions} refreshTrigger={refreshTrigger} />}
                {activeTab === 'attributes' && <AttributesView permissions={permissions} refreshTrigger={refreshTrigger} />}
                {activeTab === 'carousels' && <CarouselsView permissions={permissions} refreshTrigger={refreshTrigger} />}
            </div>
        </div>
    );
};

export default ContentManagementView;
