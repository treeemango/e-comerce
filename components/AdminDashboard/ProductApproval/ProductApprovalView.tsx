import React, { useEffect, useRef, useState } from 'react';
import { createConversation, fetchPendingProducts, approveProduct, rejectProduct, hasResourcePermission, saveProductImageEmbedding, ensureSupportConversation, sendMessage, findConversationId } from '@/lib/api';
import { EmbeddingService } from '@/lib/embedding';
import { getCurrencySymbol } from '@/lib/currency';
import type { PendingProduct, AdminPermissions } from '@/types';

interface ProductApprovalCardProps {
    product: PendingProduct;
    onApprove: (productId: string) => void;
    onReject: (productId: string, reason: string) => void;
    onMessageSeller: (product: PendingProduct) => void;
    canMessageSeller: boolean;
    canApprove: boolean;
    canReject: boolean;
    isProcessing: boolean;
    embeddingReady: boolean;
}

const ProductApprovalCard: React.FC<ProductApprovalCardProps> = ({
    product,
    onApprove,
    onReject,
    onMessageSeller,
    canMessageSeller,
    canApprove,
    canReject,
    isProcessing,
    embeddingReady
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
                            {getCurrencySymbol(product.currency || 'USD')}{product.price.toFixed(2)}
                        </span>
                        {product.condition && (
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border shadow-sm ${product.condition === 'new'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                {product.condition.charAt(0).toUpperCase() + product.condition.slice(1).replace('_', ' ')}
                            </span>
                        )}
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
                                {canMessageSeller && (
                                    <button
                                        onClick={() => onMessageSeller(product)}
                                        className="ml-1 inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        title="Message seller"
                                        aria-label={`Message ${product.seller_name}`}
                                        type="button"
                                    >
                                        <i className="fas fa-comment-dots text-sm" />
                                    </button>
                                )}
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
                        {/* Listing Type Badge */}
                        {product.listing_type && product.listing_type !== 'direct_purchase' && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${product.listing_type === 'inquiry'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                <i className={`fas ${product.listing_type === 'inquiry' ? 'fa-comment-dots' : 'fa-calendar-check'}`} />
                                {product.listing_type === 'inquiry' ? 'Inquiry Only' : 'Reservation'}
                            </span>
                        )}
                        {/* Wholesale Badge */}
                        {product.has_quantity_discount && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                <i className="fas fa-layer-group" />
                                Wholesale Tiers
                            </span>
                        )}
                        {/* Free Delivery Badge */}
                        {product.free_delivery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <i className="fas fa-truck" />
                                Free Delivery
                            </span>
                        )}
                        {/* Express Delivery Badge */}
                        {product.is_express_delivery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                                <i className="fas fa-bolt" />
                                Express
                            </span>
                        )}
                        {/* Credit for Delay Badge */}
                        {(product.delay_credit ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                                <i className="fas fa-wallet" />
                                {getCurrencySymbol(product.currency)}{product.delay_credit} Credit for Delay
                            </span>
                        )}
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
                                disabled={isProcessing || !embeddingReady}
                                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-60 transition-all ${embeddingReady
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                title={!embeddingReady ? 'Waiting for AI embedding to be generated...' : 'Approve this product'}
                            >
                                {!embeddingReady ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin" />
                                        <span>Generating AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check" />
                                        <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                                    </>
                                )}
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
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/50">
                        {/* Header - Fixed */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex-shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-indigo-600 font-bold">Product Review</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{product.title}</h3>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="h-11 w-11 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
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
                                        <DetailTile label="Price" value={`${getCurrencySymbol(product.currency || 'USD')}${product.price.toFixed(2)}`} icon="fa-tag" />
                                        <DetailTile label="Submitted" value={new Date(product.submitted_at).toLocaleString()} icon="fa-clock" />
                                        {product.brand_name && <DetailTile label="Brand" value={product.brand_name} icon="fa-certificate" />}
                                        {product.condition && (
                                            <DetailTile
                                                label="Condition"
                                                value={product.condition.charAt(0).toUpperCase() + product.condition.slice(1).replace('_', ' ')}
                                                icon="fa-star"
                                            />
                                        )}
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
                                            {canMessageSeller && (
                                                <button
                                                    onClick={() => {
                                                        setShowDetails(false);
                                                        onMessageSeller(product);
                                                    }}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50 disabled:opacity-50"
                                                    type="button"
                                                >
                                                    <i className="fas fa-comment-dots" />
                                                    Message seller
                                                </button>
                                            )}
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
                                                                <div className="text-sm text-slate-600">{getCurrencySymbol(product.currency || 'USD')}{variant.price?.toFixed(2) ?? '—'}</div>
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

                                    {/* Wholesale Pricing Tiers */}
                                    {product.quantity_discounts && product.quantity_discounts.length > 0 && (
                                        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-purple-700 font-semibold">
                                                <i className="fas fa-layer-group text-purple-500" />
                                                Wholesale Pricing Tiers
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {product.quantity_discounts.map((tier, idx) => (
                                                    <div key={idx} className="bg-white border border-purple-100 rounded-lg p-3 text-center shadow-sm">
                                                        <div className="text-xs text-purple-500 font-semibold uppercase tracking-wider">Min {tier.min_quantity}+ units</div>
                                                        <div className="text-lg font-bold text-purple-700 mt-1">{getCurrencySymbol(product.currency || 'USD')}{tier.unit_price.toFixed(2)}</div>
                                                        <div className="text-[10px] text-purple-400 font-medium">per unit</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery & Listing Info */}
                                    {(product.listing_type || product.free_delivery || product.is_express_delivery || product.delivery_locations?.length) && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                                <i className="fas fa-truck text-slate-500" />
                                                Delivery & Listing Settings
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {product.listing_type && product.listing_type !== 'direct_purchase' && (
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${product.listing_type === 'inquiry'
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                        <i className={`fas ${product.listing_type === 'inquiry' ? 'fa-comment-dots' : 'fa-calendar-check'} mr-1`}></i>
                                                        {product.listing_type === 'inquiry' ? 'Inquiry Only' : 'Reservation Mode'}
                                                    </span>
                                                )}
                                                {product.free_delivery && (
                                                    <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                                        <i className="fas fa-truck mr-1"></i>Free Delivery
                                                    </span>
                                                )}
                                                {product.is_express_delivery && (
                                                    <span className="bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                                        <i className="fas fa-bolt mr-1"></i>Express Available
                                                    </span>
                                                )}
                                                {product.sale_unit && (
                                                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                                        <i className="fas fa-balance-scale mr-1"></i>Sold per {product.sale_unit}
                                                    </span>
                                                )}
                                            </div>
                                            {product.delivery_locations && product.delivery_locations.length > 0 && (
                                                <div className="mt-2">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Delivery Locations:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.delivery_locations.map((loc, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{loc}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tags Section */}
                                    {((product.tags && product.tags.length > 0) || (product.use_case_tags && product.use_case_tags.length > 0) || (product.occasion_tags && product.occasion_tags.length > 0)) && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                                <i className="fas fa-tags text-slate-500" />
                                                Product Tags
                                            </div>
                                            {product.tags && product.tags.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-slate-500 font-medium mb-1">General Tags</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {product.use_case_tags && product.use_case_tags.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Use Cases</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.use_case_tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {product.occasion_tags && product.occasion_tags.length > 0 && (
                                                <div>
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Occasions</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.occasion_tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-pink-100 text-pink-600 rounded text-xs">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SEO Section */}
                                    {(product.seo_title || product.seo_description) && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-amber-700 font-semibold">
                                                <i className="fas fa-search text-amber-500" />
                                                SEO Information
                                            </div>
                                            {product.seo_title && (
                                                <div>
                                                    <div className="text-xs text-amber-600 font-medium">Meta Title</div>
                                                    <div className="text-sm text-slate-700">{product.seo_title}</div>
                                                </div>
                                            )}
                                            {product.seo_description && (
                                                <div>
                                                    <div className="text-xs text-amber-600 font-medium">Meta Description</div>
                                                    <div className="text-sm text-slate-600 line-clamp-3">{product.seo_description}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const DetailTile = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
            <i className={`fas ${icon} text-indigo-400`} />
            {label}
        </div>
        <div className="text-sm font-semibold text-slate-900 break-words">{value}</div>
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
    const [embeddingsCompleted, setEmbeddingsCompleted] = useState<Set<string>>(new Set());
    const modelTimerRef = useRef<number | null>(null);

    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageTarget, setMessageTarget] = useState<PendingProduct | null>(null);
    const [messageText, setMessageText] = useState('');
    const [messageSending, setMessageSending] = useState(false);

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

        // Update progress while waiting - model download can take 1-2 minutes
        modelTimerRef.current = window.setInterval(() => {
            setModelProgress(prev => {
                // Slowly increment but cap at 95% until model is actually ready
                if (prev >= 95) return 95;
                return prev + Math.random() * 3 + 1;
            });
        }, 800);

        try {
            await embeddingService.ensureInitialized();
            // Model is now truly ready
            setModelProgress(100);
            setTimeout(() => setModelReady(true), 350);
        } catch (err) {
            console.error('Error initializing embedding model:', err);
            // Model took too long or failed - show error but still allow viewing products
            setError('AI model is still loading. Embeddings will be generated when the model is ready. You can still approve/reject products.');
            // Don't set modelReady to true - keep showing loading screen or set a reduced state
            // For now, let's allow them to proceed but embeddings won't work
            setModelProgress(100);
            setTimeout(() => setModelReady(true), 350);
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
            const embeddingService = EmbeddingService.getInstance();

            // Mark products that already have embeddings as ready
            const alreadyHaveEmbeddings = pendingProducts.filter(p =>
                p.main_image?.image_embedding || !p.main_image?.url
            );
            if (alreadyHaveEmbeddings.length > 0) {
                setEmbeddingsCompleted(prev => {
                    const newSet = new Set(prev);
                    alreadyHaveEmbeddings.forEach(p => newSet.add(p.id));
                    return newSet;
                });
                console.log(`[ProductApprovalView] ${alreadyHaveEmbeddings.length} products already have embeddings or no image.`);
            }

            // Double-check that the model is actually ready
            if (!embeddingService.isReady()) {
                console.log('[ProductApprovalView] Model not ready yet; deferring embedding generation.');
                return;
            }

            const productsNeedingEmbedding = pendingProducts.filter(p => {
                // p.main_image is the object from the API response
                return p.main_image && !p.main_image.image_embedding && p.main_image.url && p.main_image.media_id;
            });

            if (productsNeedingEmbedding.length === 0) {
                console.log('[ProductApprovalView] All products already have embeddings.');
                // Mark all products as ready
                setEmbeddingsCompleted(prev => {
                    const newSet = new Set(prev);
                    pendingProducts.forEach(p => newSet.add(p.id));
                    return newSet;
                });
                return;
            }

            console.log(`[ProductApprovalView] Found ${productsNeedingEmbedding.length} products needing embeddings.`);

            // CRITICAL: Wait for worker to be ready before proceeding
            try {
                await embeddingService.ensureInitialized();
            } catch (err) {
                console.warn('[ProductApprovalView] Could not initialize embedding model. Skipping embedding generation.', err);
                return;
            }

            console.log('[ProductApprovalView] Embedding model ready. Starting generation...');

            // Process sequentially
            for (const product of productsNeedingEmbedding) {
                try {
                    // Re-check readiness before each request in case something changed
                    if (!embeddingService.isReady()) {
                        console.log('[ProductApprovalView] Model became unavailable. Stopping embedding generation.');
                        break;
                    }

                    const imageUrl = product.main_image?.image_url || product.main_image?.url;
                    const mediaId = product.main_image?.media_id;
                    if (!imageUrl || !mediaId) continue;

                    console.log(`[ProductApprovalView] Generating embedding for product ${product.title}...`);
                    const embedding = await embeddingService.generateImageEmbedding(imageUrl);
                    const saved = await saveProductImageEmbedding(product.id, mediaId, embedding);
                    if (saved) {
                        console.log(`[ProductApprovalView] ✓ Saved embedding for ${product.title}`);
                        // Mark this product's embedding as complete
                        setEmbeddingsCompleted(prev => {
                            const newSet = new Set(prev);
                            newSet.add(product.id);
                            return newSet;
                        });
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

            const product = products.find(p => p.id === productId);
            const success = await rejectProduct(productId, adminId, reason);

            if (success) {
                // Automate rejection message
                if (product && product.seller_id) {
                    try {
                        const conversationId = await ensureSupportConversation(product.seller_id);
                        if (conversationId) {
                            await sendMessage(
                                conversationId,
                                adminId,
                                product.seller_id,
                                `Your product "${product.title}" has been rejected.\n\nReason: ${reason}`
                            );
                        }
                    } catch (msgErr) {
                        console.error('Failed to send rejection message:', msgErr);
                    }
                }

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

    const openMessageSeller = (product: PendingProduct) => {
        setMessageTarget(product);
        setMessageText('');
        setMessageModalOpen(true);
    };

    const handleSendQuickMessage = async () => {
        if (!messageTarget) return;
        const adminId = permissions?.user_id;
        const sellerId = messageTarget.seller_id;
        const content = messageText.trim();

        if (!adminId) {
            setError('Admin ID not found');
            return;
        }
        if (!sellerId) {
            setError('Seller ID not found');
            return;
        }
        if (!content) return;

        setMessageSending(true);
        try {
            const existingConversationId = await findConversationId({
                sellerId,
                buyerId: adminId,
                productId: messageTarget.id
            });

            let ok = false;
            if (existingConversationId) {
                ok = await sendMessage(existingConversationId, adminId, sellerId, content, {
                    context: 'product_approval',
                    product_id: messageTarget.id
                });
            } else {
                const conversationId = await createConversation(
                    sellerId,
                    adminId,
                    messageTarget.id,
                    'Product Submission',
                    content
                );
                ok = Boolean(conversationId);
            }

            if (!ok) throw new Error('Failed to send message');

            setMessageModalOpen(false);
            setMessageTarget(null);
            setMessageText('');
        } catch (err) {
            console.error('Error sending quick message:', err);
            alert('Failed to send message. Please try again.');
        } finally {
            setMessageSending(false);
        }
    };

    if (!modelReady) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 text-white shadow-2xl">
                    {/* Decorative blurs */}
                    <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-indigo-500/30 blur-3xl" />
                    <div className="pointer-events-none absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

                    <div className="relative p-10">
                        {/* Header */}
                        <div className="flex items-start gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-sm flex-shrink-0">
                                <i className="fas fa-brain text-3xl animate-pulse"></i>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 font-bold">AI Visual Search</p>
                                <h2 className="text-2xl font-bold mt-1">Initializing Vision Model</h2>
                                <p className="text-sm text-white/70 mt-2 leading-relaxed max-w-xl">
                                    We're loading an AI model that generates visual embeddings for product images.
                                    This enables <span className="text-indigo-300 font-semibold">reverse image search</span> and
                                    <span className="text-indigo-300 font-semibold"> visual similarity matching</span> across your catalog.
                                </p>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="mt-8 bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="flex justify-between items-center text-sm mb-3">
                                <span className="text-white/80 font-semibold flex items-center gap-2">
                                    <i className="fas fa-download text-indigo-400"></i>
                                    Model Download Progress
                                </span>
                                <span className="font-mono text-lg font-bold text-indigo-300">{Math.round(modelProgress)}%</span>
                            </div>
                            <div className="h-4 rounded-full bg-white/10 overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-400 transition-all duration-500 ease-out rounded-full shadow-lg shadow-indigo-500/30"
                                    style={{ width: `${Math.min(modelProgress, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Important Notice */}
                        <div className="mt-6 bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 flex items-start gap-3">
                            <i className="fas fa-exclamation-triangle text-amber-400 text-lg mt-0.5"></i>
                            <div>
                                <p className="font-bold text-amber-300 text-sm">Please Don't Navigate Away</p>
                                <p className="text-amber-200/80 text-xs mt-1">
                                    Stay on this page until the model finishes loading. Switching tabs or navigating away may interrupt the download and require restarting.
                                </p>
                            </div>
                        </div>

                        {/* How It Works Section */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
                                    <i className="fas fa-image text-indigo-400"></i>
                                </div>
                                <h4 className="font-bold text-sm">1. Image Analysis</h4>
                                <p className="text-xs text-white/60 mt-1">Each product image is processed by the AI model to extract visual features.</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                                    <i className="fas fa-database text-blue-400"></i>
                                </div>
                                <h4 className="font-bold text-sm">2. Embedding Storage</h4>
                                <p className="text-xs text-white/60 mt-1">Visual fingerprints are saved to the database for fast similarity matching.</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <i className="fas fa-search text-emerald-400"></i>
                                </div>
                                <h4 className="font-bold text-sm">3. Ready to Search</h4>
                                <p className="text-xs text-white/60 mt-1">Buyers can search by uploading images to find visually similar products.</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center text-xs text-white/50">
                            <p>Products will appear automatically once the model is ready • Embeddings are generated in background</p>
                        </div>
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
                        const canMessageSeller = Boolean(permissions?.user_id);

                        return (
                            <ProductApprovalCard
                                key={product.id}
                                product={product}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onMessageSeller={openMessageSeller}
                                canMessageSeller={canMessageSeller}
                                canApprove={canApprove}
                                canReject={canReject}
                                isProcessing={processingId === product.id}
                                embeddingReady={embeddingsCompleted.has(product.id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Quick Message Modal */}
            {messageModalOpen && messageTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-indigo-600 font-bold">Quick Message</p>
                                <h3 className="text-xl font-bold text-slate-900 mt-1">Message {messageTarget.seller_name}</h3>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">Regarding: <span className="font-semibold text-slate-800">{messageTarget.title}</span></p>
                            </div>
                            <button
                                onClick={() => {
                                    if (messageSending) return;
                                    setMessageModalOpen(false);
                                    setMessageTarget(null);
                                    setMessageText('');
                                }}
                                className="h-11 w-11 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                type="button"
                                aria-label="Close"
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        e.preventDefault();
                                        if (!messageSending) handleSendQuickMessage();
                                    }
                                }}
                                className="w-full min-h-[140px] rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Write a message to the seller…"
                            />

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                    <span className="font-semibold">Tip:</span> Press <span className="font-mono">Ctrl</span>+<span className="font-mono">Enter</span> to send
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (messageSending) return;
                                            setMessageModalOpen(false);
                                            setMessageTarget(null);
                                            setMessageText('');
                                        }}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                                        type="button"
                                        disabled={messageSending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendQuickMessage}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:shadow-xl disabled:opacity-60"
                                        type="button"
                                        disabled={messageSending || !messageText.trim()}
                                    >
                                        {messageSending ? (
                                            <span className="inline-flex items-center gap-2"><i className="fas fa-spinner fa-spin" /> Sending…</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2"><i className="fas fa-paper-plane" /> Send</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductApprovalView;
