import React from 'react';

interface SellerProfileViewProps {
    sellerId: string;
}

const SellerProfileView: React.FC<SellerProfileViewProps> = ({ sellerId }) => {
    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900">Account</h1>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
                <div className="text-sm text-gray-700">
                    Seller account settings for <span className="font-medium">{sellerId || '—'}</span>
                </div>
                <p className="text-sm text-gray-500">
                    This view was missing from the project. Add your seller profile, tax, and notification settings UI here.
                </p>
            </div>
        </div>
    );
};

export default SellerProfileView;
