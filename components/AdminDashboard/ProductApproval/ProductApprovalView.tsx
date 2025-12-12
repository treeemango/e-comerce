import React, { useEffect, useRef, useState } from 'react';
import { fetchPendingProducts, approveProduct, rejectProduct, hasResourcePermission, saveProductImageEmbedding } from '@/lib/api';
import { EmbeddingService } from '@/lib/embedding';
import type { PendingProduct, AdminPermissions } from '@/types';

interface ProductApprovalCardProps {
    product: PendingProduct;
    onApprove: (productId: string) => void;
    onReject: (productId: string, reason: string) => void;
    canApprove: boolean;
    canReject: boolean;
}

const ProductApprovalCard: React.FC<ProductApprovalCardProps> = ({
    product,
    onApprove,
    onReject,
    canApprove,
    canReject
}) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const handleReject = () => {
        if (rejectionReason.trim()) {
            onReject(product.id, rejectionReason);
            setShowRejectModal(false);
            setRejectionReason('');
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {product.image_url && product.image_url.trim() !== '' ? (
                        <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <i className="fas fa-image text-gray-400 text-4xl"></i>
                    )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{product.seller_name}</p>
                    <p className="text-lg font-bold text-blue-600 mb-2">${product.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mb-4">
                        Submitted: {new Date(product.submitted_at).toLocaleDateString()}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {canApprove && (
                            <button
                                onClick={() => onApprove(product.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-check"></i>
                                <span>Approve</span>
                            </button>
                        )}
                        {canReject && (
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-times"></i>
                                <span>Reject</span>
                            </button>
                        )}
                        {!canApprove && !canReject && (
                            <div className="w-full text-center text-gray-400 text-sm py-2 bg-gray-50 rounded-lg">
                                Read Only
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reject Product</h2>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejecting this product:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={4}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reject Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface ProductApprovalViewProps {
    permissions?: AdminPermissions;
}

const ProductApprovalView: React.FC<ProductApprovalViewProps> = ({ permissions }) => {
    const [products, setProducts] = useState<PendingProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [modelReady, setModelReady] = useState(false);
    const [modelProgress, setModelProgress] = useState(12);
    const [embeddingRun, setEmbeddingRun] = useState(false);
    const modelTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const bootstrap = async () => {
            await startModelWarmup();
            loadPendingProducts();
        };

        bootstrap();

        return () => {
            if (modelTimerRef.current) {
                clearInterval(modelTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (modelReady && !embeddingRun && products.length) {
            setEmbeddingRun(true);
            processEmbeddings(products);
        }
    }, [modelReady, embeddingRun, products]);

    const startModelWarmup = async () => {
        const embeddingService = EmbeddingService.getInstance();

        if (embeddingService.isReady()) {
            setModelProgress(100);
            setModelReady(true);
            return;
        }

        modelTimerRef.current = window.setInterval(() => {
            setModelProgress(prev => Math.min(prev + Math.random() * 8 + 4, 92));
        }, 420);

        try {
            await embeddingService.ensureInitialized();
            setModelProgress(100);
            setTimeout(() => setModelReady(true), 350);
        } catch (err) {
            console.error('Error initializing embedding model:', err);
            setError('Unable to load AI tools. Please refresh the page.');
        } finally {
            if (modelTimerRef.current) {
                clearInterval(modelTimerRef.current);
                modelTimerRef.current = null;
            }
        }
    };

    const loadPendingProducts = async () => {
        try {
            setLoading(true);
            const data = await fetchPendingProducts();
            setProducts(data);
            setError(null);
            setEmbeddingRun(false);
        } catch (err) {
            console.error('Error loading pending products:', err);
            setError('Failed to load pending products');
        } finally {
            setLoading(false);
        }
    };

    const processEmbeddings = async (pendingProducts: any[]) => {
        try {
            if (!modelReady) {
                console.log('[ProductApprovalView] Model not ready yet; deferring embedding generation.');
                return;
            }

            const productsNeedingEmbedding = pendingProducts.filter(p => {
                // p.main_image is the object from the API response
                return p.main_image && !p.main_image.image_embedding && p.main_image.url && p.main_image.media_id;
            });

            if (productsNeedingEmbedding.length === 0) {
                console.log('[ProductApprovalView] All products already have embeddings.');
                return;
            }

            console.log(`[ProductApprovalView] Found ${productsNeedingEmbedding.length} products needing embeddings. Initializing model...`);
            const embeddingService = EmbeddingService.getInstance();

            // CRITICAL: Wait for worker to be ready before proceeding
            await embeddingService.ensureInitialized();
            console.log('[ProductApprovalView] Embedding model ready. Starting generation...');

            // Process sequentially
            for (const product of productsNeedingEmbedding) {
                try {
                    const imageUrl = product.main_image?.image_url || product.main_image?.url;
                    const mediaId = product.main_image?.media_id;
                    if (!imageUrl || !mediaId) continue;

                    console.log(`[ProductApprovalView] Generating embedding for product ${product.title}...`);
                    const embedding = await embeddingService.generateImageEmbedding(imageUrl);
                    const saved = await saveProductImageEmbedding(product.id, mediaId, embedding);
                    if (saved) {
                        console.log(`[ProductApprovalView] ✓ Saved embedding for ${product.title}`);
                    }
                } catch (err) {
                    console.error(`[ProductApprovalView] Failed to generate embedding for ${product.title}:`, err);
                }
            }

            console.log('[ProductApprovalView] Embedding generation complete.');
        } catch (err) {
            console.error('[ProductApprovalView] Error in processEmbeddings:', err);
        }
    };

    const canApprove = hasResourcePermission(permissions?.permissions, 'products', 'approve');
    const canReject = hasResourcePermission(permissions?.permissions, 'products', 'reject');

    const handleApprove = async (productId: string) => {
        try {
            setProcessingId(productId);
            // Get admin user ID from permissions
            const adminId = permissions?.user_id;
            if (!adminId) {
                setError('Admin ID not found');
                return;
            }
            const success = await approveProduct(productId, adminId);

            if (success) {
                setProducts(products.filter(p => p.id !== productId));
                // Show success notification
            } else {
                setError('Failed to approve product');
            }
        } catch (err) {
            console.error('Error approving product:', err);
            setError('Failed to approve product');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (productId: string, reason: string) => {
        try {
            setProcessingId(productId);
            // Get admin user ID from permissions
            const adminId = permissions?.user_id;
            if (!adminId) {
                setError('Admin ID not found');
                return;
            }
            const success = await rejectProduct(productId, adminId, reason);

            if (success) {
                setProducts(products.filter(p => p.id !== productId));
                // Show success notification
            } else {
                setError('Failed to reject product');
            }
        } catch (err) {
            console.error('Error rejecting product:', err);
            setError('Failed to reject product');
        } finally {
            setProcessingId(null);
        }
    };

    if (!modelReady) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-700 text-white shadow-2xl p-8">
                    <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                    <div className="pointer-events-none absolute -right-12 -bottom-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

                    <div className="relative flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur">
                            <i className="fas fa-robot text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Loading tools</p>
                            <h2 className="text-2xl font-semibold">Preparing vision model</h2>
                            <p className="text-sm text-white/75 mt-1">We are downloading the model so you can approve products with embeddings.</p>
                        </div>
                    </div>

                    <div className="relative mt-6">
                        <div className="flex justify-between text-sm text-white/70">
                            <span>Model download</span>
                            <span>{Math.round(modelProgress)}%</span>
                        </div>
                        <div className="mt-2 h-3 rounded-full bg-white/15 overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-white/90 transition-[width] duration-300 ease-out"
                                style={{ width: `${Math.min(modelProgress, 100)}%` }}
                            />
                        </div>
                        <div className="mt-3 text-sm text-white/70">Products will appear as soon as the model is ready.</div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Approval</h1>
                    <p className="text-gray-600 mt-1">{products.length} pending products</p>
                </div>
                <button
                    onClick={loadPendingProducts}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <i className="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <i className="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending products to review at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => {
                        // Super admin always has full access, otherwise check granular permissions
                        const isSuperAdmin = permissions?.permission_level === 'super_admin';
                        const canApprove = isSuperAdmin || hasResourcePermission(permissions?.permissions, 'products', 'approve');
                        const canReject = isSuperAdmin || hasResourcePermission(permissions?.permissions, 'products', 'reject');

                        return (
                            <ProductApprovalCard
                                key={product.id}
                                product={product}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                canApprove={canApprove}
                                canReject={canReject}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProductApprovalView;
