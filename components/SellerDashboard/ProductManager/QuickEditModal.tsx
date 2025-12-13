import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productId: string, updates: ProductUpdates) => Promise<void>;
    product: Product;
}

export interface ProductUpdates {
    price: number;
    originalPrice: number;
    promoText: string;
    promoCode?: string;
    youtubeUrl: string;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({ isOpen, onClose, onSave, product }) => {
    const [price, setPrice] = useState<number | ''>(0);
    const [originalPrice, setOriginalPrice] = useState<number | ''>(0);
    const [promoText, setPromoText] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state when product changes or modal opens
    useEffect(() => {
        if (isOpen && product) {
            setPrice(product.price || 0);
            setOriginalPrice(product.originalPrice || 0); // Assuming originalPrice is available on Product
            setPromoText(product.promoText || '');

            // Try to find youtube URL in media
            const ytMedia = product.media?.find(m => m.type === 'youtube' || m.type === 'video');
            setYoutubeUrl(ytMedia?.url || '');

            setError(null);
        }
    }, [isOpen, product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (price === '' || originalPrice === '') {
            setError('Price and Original Price are required.');
            return;
        }

        if (Number(price) > Number(originalPrice)) {
            setError('Price cannot be higher than Original Price.');
            return;
        }

        if (promoText.length > 40) {
            setError('Promo text must be 40 characters or less.');
            return;
        }

        try {
            setIsSaving(true);
            await onSave(product.id.toString(), {
                price: Number(price),
                originalPrice: Number(originalPrice),
                promoText,
                youtubeUrl
            });
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to update product. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Edit Product</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 flex items-start gap-2">
                            <span className="material-icons text-sm mt-0.5">error_outline</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Price Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price ({product.currency || 'USD'})
                            </label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Original Price
                            </label>
                            <input
                                type="number"
                                value={originalPrice}
                                onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Promo Text */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Promo Badge Text
                            </label>
                            <span className={`text-xs ${promoText.length > 40 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {promoText.length}/40
                            </span>
                        </div>
                        <input
                            type="text"
                            value={promoText}
                            onChange={(e) => setPromoText(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 ${promoText.length > 40 ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="e.g. Summer Sale, limited time..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Short text shown on the product card.</p>
                    </div>

                    {/* YouTube URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            YouTube Video URL
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-sm">
                                play_circle_filled
                            </span>
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Paste a YouTube link to add a video to your product.</p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 flex items-center gap-2"
                            disabled={isSaving}
                        >
                            {isSaving && <span className="material-icons animate-spin text-sm">refresh</span>}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickEditModal;
