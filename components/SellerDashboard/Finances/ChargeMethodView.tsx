import React, { useState, useEffect } from 'react';
import { fetchSellerFinancials } from '../../../lib/api';

interface ChargeMethodViewProps {
    sellerId: string;
}

const ChargeMethodView: React.FC<ChargeMethodViewProps> = ({ sellerId }) => {
    // For now, this is a placeholder for sensitive data handling
    // In a real app, this would integration with Stripe Connect or similar

    return (
        <div className="space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900">Charge Method</h1>
            <p className="text-gray-600">Manage the credit card on file for selling fees and subscription charges.</p>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                            <span className="font-bold text-xs text-gray-500">VISA</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Visa ending in 4242</p>
                            <p className="text-sm text-gray-500">Expires 12/2028</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Primary</span>
                        <button className="text-gray-400 hover:text-gray-600">
                            <span className="material-icons">more_vert</span>
                        </button>
                    </div>
                </div>

                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span className="material-icons text-sm">add</span>
                    Add new charge method
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 text-sm mb-1">About Charge Methods</h4>
                <p className="text-sm text-blue-800">
                    JuaExpress requires a valid credit card on file to cover any selling fees if your account balance is insufficient.
                    Your card details are securely stored.
                </p>
            </div>
        </div>
    );
};

export default ChargeMethodView;
