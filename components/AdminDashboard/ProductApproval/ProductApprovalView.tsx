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
    isProcessing: boolean;
}

const ProductApprovalCard: React.FC<ProductApprovalCardProps> = ({
    product,
    onApprove,
    onReject,
    canApprove,
    canReject,
    isProcessing
}) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    const gallery = (product.media && product.media.length > 0)
        ? product.media
        : (product.image_url ? [{ id: 'primary', image_url: product.image_url, is_main: true, media_type: 'image' }] : []);
    const primaryMedia = gallery.find(m => m.is_main) || gallery[0];

    const handleReject = () => {
        if (rejectionReason.trim()) {
            onReject(product.id, rejectionReason);
            setShowRejectModal(false);
            setRejectionReason('');
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                {/* Media */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 via-white to-slate-100">
                    {primaryMedia?.image_url ? (
                        <img
                            src={primaryMedia.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <i className="fas fa-image text-4xl" />
                        </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-slate-700 border border-white shadow-sm">
                            {product.category_name}
                        </span>
                        {product.brand_name && (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-100 shadow-sm">
                                {product.brand_name}
                            </span>
                        )}
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-sm">
                            ${product.price.toFixed(2)}
                        </span>
                    </div>

                    <div className="absolute bottom-3 right-3 text-xs text-white bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2 shadow-md">
                        <i className="far fa-clock" />
                        <span>{new Date(product.submitted_at).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{product.title}</h3>
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                                <i className="fas fa-store text-slate-400" />
                                <span className="font-medium text-slate-800">{product.seller_name}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDetails(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold"
                        >
                            <span>View details</span>
                            <i className="fas fa-arrow-up-right-from-square text-xs" />
                        </button>
                    </div>

                    {product.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <i className="fas fa-tag text-slate-500" />
                            Pending approval
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <i className="fas fa-shield-alt" />
                            Risk checks queued
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        {canReject && (
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={isProcessing}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50"
                            >
                                <i className="fas fa-ban" />
                                Reject
                            </button>
                        )}
                        {canApprove && (
                            <button
                                onClick={() => onApprove(product.id)}
                                disabled={isProcessing}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-60"
                            >
                                <i className="fas fa-check" />
                                {isProcessing ? 'Processing...' : 'Approve'}
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

            {/* Details Drawer */}
            {showDetails && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Product review</p>
                                <h3 className="text-xl font-semibold text-slate-900">{product.title}</h3>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="h-10 w-10 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                            <div className="space-y-4">
                                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                    {gallery[activeMediaIndex]?.image_url ? (
                                        <img src={gallery[activeMediaIndex].image_url} alt={product.title} className="w-full h-[360px] object-cover" />
                                    ) : (
                                        <div className="h-[360px] flex items-center justify-center text-slate-300">
                                            <i className="fas fa-image text-5xl" />
                                        </div>
                                    )}
                                </div>
                                {gallery.length > 1 && (
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {gallery.map((media, idx) => (
                                            <button
                                                key={media.id || idx}
                                                onClick={() => setActiveMediaIndex(idx)}
                                                className={`h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden border ${idx === activeMediaIndex ? 'border-slate-900 ring-2 ring-slate-300' : 'border-slate-200 hover:border-slate-400'}`}
                                            >
                                                {media.image_url ? (
                                                    <img src={media.image_url} alt={`${product.title}-${idx}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <i className="fas fa-image" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {product.description && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailTile label="Seller" value={product.seller_name} icon="fa-store" />
                                    <DetailTile label="Category" value={product.category_name} icon="fa-layer-group" />
                                    <DetailTile label="Price" value={`$${product.price.toFixed(2)}`} icon="fa-tag" />
                                    <DetailTile label="Submitted" value={new Date(product.submitted_at).toLocaleString()} icon="fa-clock" />
                                    {product.brand_name && <DetailTile label="Brand" value={product.brand_name} icon="fa-certificate" />}
                                    {product.options && product.options.length > 0 && (
                                        <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                                                <i className="fas fa-swatchbook text-slate-400" />
                                                Options
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {product.options.map(opt => (
                                                    <span key={opt.name} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-sm text-slate-700 shadow-sm">
                                                        {opt.name}: {opt.values.join(', ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                        <i className="fas fa-clipboard-list text-slate-500" />
                                        Quick actions
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {canReject && (
                                            <button
                                                onClick={() => {
                                                    setShowDetails(false);
                                                    setShowRejectModal(true);
                                                }}
                                                disabled={isProcessing}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <i className="fas fa-ban" />
                                                Reject
                                            </button>
                                        )}
                                        {canApprove && (
                                            <button
                                                onClick={() => onApprove(product.id)}
                                                disabled={isProcessing}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-900 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-60"
                                            >
                                                <i className="fas fa-check" />
                                                {isProcessing ? 'Processing...' : 'Approve now'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {product.variants && product.variants.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                            <i className="fas fa-boxes-stacked text-slate-500" />
                                            Variants
                                        </div>
                                        <div className="space-y-2 max-h-72 overflow-auto pr-1">
                                            {product.variants.map(variant => {
                                                const optionSummary = variant.options ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' • ') : null;
                                                return (
                                                    <div key={variant.id} className="border border-slate-200 rounded-lg p-3 flex items-center gap-3 bg-slate-50">
                                                        {variant.image_url ? (
                                                            <img src={variant.image_url} alt={variant.title || 'Variant'} className="h-14 w-14 rounded-md object-cover border border-slate-200" />
                                                        ) : (
                                                            <div className="h-14 w-14 rounded-md border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-xs">IMG</div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-slate-900">{variant.title || 'Variant'}</span>
                                                                {variant.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Default</span>}
                                                            </div>
                                                            <div className="text-sm text-slate-600">${variant.price?.toFixed(2) ?? '—'}</div>
                                                            {optionSummary && <div className="text-xs text-slate-500">{optionSummary}</div>}
                                                            {variant.sku && <div className="text-[11px] text-slate-400">SKU: {variant.sku}</div>}
                                                        </div>
                                                        {typeof variant.stock === 'number' && (
                                                            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                                                                Stock: {variant.stock}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const DetailTile = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <i className={`fas ${icon} text-slate-400`} />
            {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900 break-words">{value}</div>
    </div>
);

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
                                isProcessing={processingId === product.id}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProductApprovalView;
