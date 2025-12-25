import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { fetchQuantityDiscounts, isInWishlist, toggleWishlist, fetchRelatedProducts, RelatedProduct, fetchProductVariants, getFollowStatus, toggleFollowStore } from '@/lib/api';
import { Product, QuantityDiscountTier, User, ProductOption, ProductVariant } from '@/types';
import { playWishlistAddSound, playWishlistRemoveSound, playFollowSound, playUnfollowSound } from '@/lib/sounds';
import { ProductCard } from './ProductCard';
import ProductQuestions from '../../components/ProductDetails/ProductQuestions';

interface ProductDetailsProps {
    product: Product;
    onBack: () => void;
    onProductClick: (product: Product) => void;
    recommendations?: Product[];
    onAddToCart?: (product: Product) => void;
    onBuyNow?: (product: Product) => void;
    onVisualSearch?: (product: Product) => void;
    onMessageSeller?: (product: Product, initialMessage: string) => void;
    onVisitStore?: (vendorId: string) => void;
    user?: User | null;
}

interface TouchPosition {
    x: number;
    y: number;
    time: number;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onBack, onProductClick, recommendations, onAddToCart, onBuyNow, user, onVisualSearch, onMessageSeller, onVisitStore }) => {
    const [currentImage, setCurrentImage] = useState(0);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
    const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);
    const [quantityDiscounts, setQuantityDiscounts] = useState<QuantityDiscountTier[]>([]);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isWishlistLoading, setIsWishlistLoading] = useState(false);
    const [sameItems, setSameItems] = useState<RelatedProduct[]>([]);
    const [similarItems, setSimilarItems] = useState<RelatedProduct[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [useCaseItems, setUseCaseItems] = useState<Product[]>([]);

    // Variants State
    const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
    const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
    const [isLoadingVariants, setIsLoadingVariants] = useState(false);
    const [isVariationSheetOpen, setIsVariationSheetOpen] = useState(false);
    const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});

    // Message Sheet State
    const [isMessageSheetOpen, setIsMessageSheetOpen] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const imageContainerRef = useRef<HTMLDivElement>(null);

    const images = useMemo(() => {
        const gallery = Array.isArray(product.gallery_media)
            ? product.gallery_media
                .map((m) => m.image_url || m.thumbnail_url)
                .filter((src): src is string => !!src)
            : [];
        const unique = Array.from(new Set([product.image, ...gallery].filter(Boolean)));
        return unique.length ? unique : [''];
    }, [product.gallery_media, product.image]);

    // Minimum swipe distance and max time for swipe detection
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStart({
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        });
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStart) return;

        const touch = e.touches[0];
        setTouchEnd({
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        });
    }, [touchStart]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStart || !touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const elapsedTime = touchEnd.time - touchStart.time;

        // Check if it's a horizontal swipe (not vertical scroll)
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
        const isValidSwipe = Math.abs(distanceX) > minSwipeDistance && elapsedTime < maxSwipeTime;

        if (isHorizontalSwipe && isValidSwipe && !isTransitioning) {
            if (distanceX > 0) {
                // Swipe left - next image
                navigateToImage(currentImage + 1);
            } else {
                // Swipe right - previous image
                navigateToImage(currentImage - 1);
            }
        }

        setTouchStart(null);
        setTouchEnd(null);
    }, [touchStart, touchEnd, currentImage, isTransitioning]);

    const navigateToImage = useCallback((newIndex: number) => {
        if (newIndex < 0 || newIndex >= images.length || isTransitioning) return;

        setIsTransitioning(true);
        setCurrentImage(newIndex);

        // Reset transition state after animation
        setTimeout(() => setIsTransitioning(false), 300);
    }, [images.length, isTransitioning]);

    React.useEffect(() => {
        if (product.has_quantity_discount) {
            fetchQuantityDiscounts(product.id.toString()).then(setQuantityDiscounts);
        }
    }, [product.id, product.has_quantity_discount]);

    // Check wishlist & follow status on mount
    useEffect(() => {
        const checkStatuses = async () => {
            if (product.id && user?.id) {
                const [inWishlist, followStatus] = await Promise.all([
                    isInWishlist(user.id, product.id.toString()),
                    product.vendor?.vendor_id ? getFollowStatus(user.id, product.vendor.vendor_id) : Promise.resolve(null)
                ]);
                setIsWishlisted(inWishlist);
                if (followStatus) {
                    setIsFollowing(followStatus.is_following);
                    setFollowerCount(followStatus.follower_count);
                }
            } else {
                setIsWishlisted(false);
                setIsFollowing(false);
            }
        };
        checkStatuses();
    }, [product.id, user?.id, product.vendor?.vendor_id]);

    useEffect(() => {
        const loadVariants = async () => {
            if (product.id) {
                setIsLoadingVariants(true);
                try {
                    const { variants, options } = await fetchProductVariants(product.id.toString());
                    setProductVariants(variants);
                    setProductOptions(options);

                    // Initialize defaults
                    if (options.length > 0) {
                        const defaults: Record<string, string> = {};
                        options.forEach(opt => {
                            defaults[opt.name] = opt.values[0];
                        });
                        setSelectedOptions(defaults);
                    }
                } catch (error) {
                    console.error('Error loading variants:', error);
                } finally {
                    setIsLoadingVariants(false);
                }
            }
        };
        loadVariants();
    }, [product.id]);

    useEffect(() => {
        if (productVariants.length > 0) {
            const matched = productVariants.find(v =>
                Object.entries(selectedOptions).every(([k, val]) => v.options && v.options[k] === val)
            );
            setCurrentVariant(matched || null);

            // Update main image if variant has one
            if (matched?.image) {
                const variantImageIdx = images.indexOf(matched.image);
                if (variantImageIdx !== -1) {
                    setCurrentImage(variantImageIdx);
                }
            }
        }
    }, [selectedOptions, productVariants, images]);

    useEffect(() => {
        const loadRelated = async () => {
            if (product?.id) {
                setIsLoadingRelated(true);
                try {
                    const { same, similar } = await fetchRelatedProducts(product.id.toString());
                    setSameItems(same);
                    setSimilarItems(similar);
                } catch (error) {
                    console.error('Error loading related products:', error);
                } finally {
                    setIsLoadingRelated(false);
                }

                // Fetch Use Case Recommendations
                if (product.use_case_tags && product.use_case_tags.length > 0) {
                    const tag = product.use_case_tags[0];
                    try {
                        const { fetchFilteredProducts } = await import('@/lib/api');
                        const results = await fetchFilteredProducts(tag, {
                            category_ids: [],
                            brand_ids: [],
                            price_min: null,
                            price_max: null
                        });
                        setUseCaseItems(results.filter(p => p.id.toString() !== product.id?.toString()).slice(0, 6));
                    } catch (e) {
                        console.error("Failed to load use case items", e);
                    }
                }
            }
        };
        loadRelated();
    }, [product.id, product.use_case_tags]);

    const handleWishlistToggle = async () => {
        if (!user) {
            alert('Please sign in to save items');
            return;
        }
        if (!product.id) return;

        setIsWishlistLoading(true);
        try {
            const result = await toggleWishlist(user.id, product.id.toString());
            if (result.success) {
                setIsWishlisted(result.inWishlist);
                // Play appropriate sound based on action
                if (result.inWishlist) {
                    playWishlistAddSound();
                } else {
                    playWishlistRemoveSound();
                }
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
        } finally {
            setIsWishlistLoading(false);
        }
    };

    const handleChatClick = () => {
        if (!user) {
            alert('Please sign in to message the seller');
            return;
        }
        if (product.listing_type === 'reservation') {
            setMessageText(`Hi, I'd like to reserve ${product.title}. Could you let me know the process?`);
        } else if (product.listing_type === 'inquiry') {
            setMessageText(`Hi, I have an inquiry about ${product.title}. Could you provide more details?`);
        } else {
            setMessageText(`Hi, I'm interested in your ${product.title}. Is it available?`);
        }
        setIsMessageSheetOpen(true);
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || isSendingMessage) return;

        setIsSendingMessage(true);
        try {
            if (onMessageSeller) {
                await onMessageSeller(product, messageText);
            }
            setIsMessageSheetOpen(false);
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleFollowToggle = async () => {
        const vendorId = product.vendor?.vendor_id || product.seller_id?.toString();
        if (!vendorId) return;

        if (!user) {
            alert('Please sign in to follow stores');
            return;
        }

        setIsFollowLoading(true);
        try {
            const result = await toggleFollowStore(user.id, vendorId);
            if (result?.success) {
                setIsFollowing(result.is_following);
                setFollowerCount(result.follower_count);

                // Play sound based on action
                if (result.is_following) {
                    playFollowSound();
                } else {
                    playUnfollowSound();
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        } finally {
            setIsFollowLoading(false);
        }
    };

    const formatPrice = (price: number, currency?: string) => {
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currency || 'USD',
                maximumFractionDigits: 2,
            }).format(price);
        } catch (e) {
            return `${currency ? currency + ' ' : ''}${price}`;
        }
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImage((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black overflow-y-auto pb-24 animate-in slide-in-from-right duration-200">
            {/* Custom Header for PDP */}
            <header className="sticky top-0 z-40 bg-white dark:bg-surface-dark shadow-sm border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-3 py-3 gap-2 max-w-[520px] mx-auto">
                    <button
                        className="flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                        onClick={onBack}
                        aria-label="Go back"
                    >
                        <span className="material-icons-outlined text-black dark:text-white text-xl">arrow_back_ios_new</span>
                    </button>

                    <div className="flex-1 max-w-xs">
                        <div className="w-full flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2">
                            <span className="material-icons-outlined text-gray-400 text-base mr-2 flex-shrink-0">search</span>
                            <span className="text-sm text-gray-500 truncate">Search JuaExpress</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <span className="material-icons-outlined text-black dark:text-white text-xl">format_list_bulleted</span>
                        </button>
                        <button className="relative min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <span className="material-icons-outlined text-black dark:text-white text-xl">shopping_cart</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Image Section */}
            <div
                ref={imageContainerRef}
                className="relative aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800 cursor-pointer touch-manipulation select-none"
                onClick={() => setIsImageViewerOpen(true)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    touchAction: 'pan-y pinch-zoom', // Allow vertical scroll and zoom but prevent horizontal scroll
                }}
            >
                {images[0] && (
                    <img
                        src={images[currentImage % images.length]}
                        alt={product.title}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isTransitioning ? 'opacity-80' : 'opacity-100'
                            }`}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                        }}
                    />
                )}

                {/* Share Icon */}
                <button className="absolute top-4 right-14 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10">
                    <span className="material-icons-outlined text-xl">ios_share</span>
                </button>

                {/* Wishlist Heart Icon */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleWishlistToggle(); }}
                    disabled={isWishlistLoading}
                    className={`absolute top-4 right-4 w-9 h-9 backdrop-blur-sm rounded-full flex items-center justify-center transition-all z-10 ${isWishlisted
                        ? 'bg-red-500 text-white'
                        : 'bg-black/40 text-white hover:bg-black/60'}`}
                >
                    <span className={`material-icons-outlined text-xl ${isWishlistLoading ? 'animate-pulse' : ''}`}>
                        {isWishlisted ? 'favorite' : 'favorite_border'}
                    </span>
                </button>

                {/* Swipe Indicators */}
                {images.length > 1 && (
                    <>
                        {/* Left Arrow Indicator */}
                        {currentImage > 0 && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
                                <span className="material-icons-outlined text-sm">chevron_left</span>
                            </div>
                        )}

                        {/* Right Arrow Indicator */}
                        {currentImage < images.length - 1 && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
                                <span className="material-icons-outlined text-sm">chevron_right</span>
                            </div>
                        )}

                        {/* Dots Indicator */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                            {images.slice(0, 5).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentImage ? 'bg-white' : 'bg-white/50'
                                        }`}
                                />
                            ))}
                            {images.length > 5 && (
                                <span className="text-white/70 text-xs ml-1">+{images.length - 5}</span>
                            )}
                        </div>
                    </>
                )}

                {/* Video Play Button */}
                {product.video && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                            <span className="material-icons-round text-white text-4xl ml-1">play_arrow</span>
                        </div>
                    </div>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md z-10">
                    {currentImage + 1}/{images.length}
                </div>

                {/* Swipe Hint */}
                {images.length > 1 && !isTransitioning && (
                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs opacity-70 z-10">
                        Swipe to view more
                    </div>
                )}
            </div>

            {/* Deal Banner */}
            {(product.activeCoupon || product.deal_type) && (
                <div className="bg-gradient-to-r from-red-700 to-red-600 px-3 py-2 text-white flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <span className="font-black text-sm italic">{product.deal_type === 'coupon' ? 'Coupon applied' : 'Limited deal'}</span>
                        {product.activeCoupon?.label && (
                            <span className="text-xs font-semibold opacity-90">{product.activeCoupon.label}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">check</span>
                            {product.deliveryText || 'Fast delivery'}
                        </div>
                        {product.activeCoupon?.endsAt && (
                            <div className="flex items-center gap-1">
                                <span className="material-icons-outlined text-sm">schedule</span>
                                Ends soon
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Info */}
            <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2">
                {/* Shipping Truck Line */}
                {product.deliveryTimeEstimate && (
                    <div className="flex items-start gap-1 text-banner-green dark:text-green-400 text-xs font-bold mb-2">
                        <span className="material-icons-round text-sm mt-0.5">local_shipping</span>
                        <span className="leading-tight">
                            {product.deliveryTimeEstimate}
                        </span>
                    </div>
                )}

                {/* Title */}
                <h1 className="text-sm font-normal text-black dark:text-white leading-snug mb-2">
                    {product.title}
                </h1>

                {/* Sales Stats */}
                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-3">
                    {typeof product.stock === 'number' && (
                        <span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
                    )}
                    {product.vendor?.business_name && (
                        <>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <div className="flex items-center gap-1">
                                Sold by {product.vendor.business_name}
                                <span className="material-icons-outlined text-black dark:text-white text-sm">store</span>
                            </div>
                        </>
                    )}
                    {((product.rating ?? 0) > 0 && (product.reviews ?? 0) > 0) && (
                        <>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <div className="flex items-center gap-1 text-black dark:text-white">
                                <span className="material-icons !text-[14px]">star</span>
                                <span className="font-bold">{product.rating?.toFixed(1)}</span>
                            </div>
                            <span>({product.reviews} reviews)</span>
                        </>
                    )}
                </div>

                {/* Price */}
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-black text-price-red">
                        {formatPrice(currentVariant?.price || product.price, product.currency)}
                    </span>
                    {(currentVariant?.price || product.price) < (product.originalPrice || 0) && (
                        <span className="text-sm text-gray-400 line-through mb-1">
                            {formatPrice(product.originalPrice!, product.currency)}
                        </span>
                    )}
                    {product.discountPercent && (
                        <span className="text-[10px] text-price-red bg-red-50 dark:bg-red-900/20 border border-price-red/30 px-1.5 py-0.5 rounded font-black mb-1 uppercase tracking-tighter">
                            -{product.discountPercent}%
                        </span>
                    )}
                </div>

                {/* Automatic Promotions (e.g. Buy X Get Y) */}
                {product.auto_discount_type && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                            <span className="material-icons-round">redeem</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                {product.auto_discount_name || 'Promotion'}
                            </div>
                            <div className="text-sm font-black text-black dark:text-white leading-tight">
                                {product.auto_discount_type === 'buy_x_get_y'
                                    ? `Buy ${product.auto_discount_buy_qty} get ${product.auto_discount_get_qty} free`
                                    : product.auto_discount_type === 'percentage'
                                        ? `${product.auto_discount_value}% discount applied at checkout`
                                        : `${formatPrice(product.auto_discount_value || 0, product.currency)} off applied at checkout`
                                }
                            </div>
                            {product.auto_discount_min_requirement && product.auto_discount_min_requirement > 0 && (
                                <div className="text-[10px] text-gray-500 mt-1">
                                    Min. order: {formatPrice(product.auto_discount_min_requirement, product.currency)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk Pricing Section */}
                {quantityDiscounts.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons-outlined text-emerald-600 dark:text-emerald-400">groups</span>
                            <span className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wider">Bulk Pricing Discounts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {quantityDiscounts.map((tier, idx) => (
                                <div key={idx} className="bg-white dark:bg-emerald-900/40 p-3 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Buy {tier.min_quantity}+</div>
                                    <div className="text-lg font-black text-black dark:text-white">
                                        {formatPrice(tier.unit_price, product.currency)}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Save {Math.round((1 - tier.unit_price / product.price) * 100)}% per item
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Variations Section - Trigger for Overlay */}
            {productOptions.length > 0 && (
                <div
                    onClick={() => setIsVariationSheetOpen(true)}
                    className="bg-surface-light dark:bg-surface-dark p-4 mb-2 space-y-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Variations</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-black dark:text-white">
                                    {Object.values(selectedOptions).join(' / ') || 'Choose Options'}
                                </span>
                            </div>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {productVariants.filter(v => v.image).slice(0, 5).map((v, i) => (
                            <div key={i} className="w-12 h-12 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden flex-shrink-0">
                                <img src={v.image!} className="w-full h-full object-cover" alt="" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Product Details & Tags Section */}
            <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2 space-y-4">
                {/* Description */}
                {(product.description) && (
                    <div>
                        <h3 className="font-bold text-black dark:text-white mb-2 text-sm">About Item</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {product.description}
                        </p>
                    </div>
                )}

                {/* Tags (Horizontal Scroll) */}
                {(product.tags?.length || product.use_case_tags?.length || product.occasion_tags?.length) && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                        {product.occasion_tags?.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full whitespace-nowrap border border-purple-100 dark:border-purple-800">
                                {tag}
                            </span>
                        ))}
                        {product.use_case_tags?.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full whitespace-nowrap border border-blue-100 dark:border-blue-800">
                                {tag}
                            </span>
                        ))}
                        {product.tags?.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-medium rounded-full whitespace-nowrap border border-gray-200 dark:border-gray-700">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Product Q&A */}
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-transparent rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                    <ProductQuestions product={product} />
                </div>

                {/* Enhanced Delivery Details */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons-outlined text-orange-500 text-sm">local_shipping</span>
                        <span className="text-xs font-bold text-black dark:text-white">Delivery Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
                        <div>
                            <span className="text-gray-500 block">Scope</span>
                            <span className="font-medium text-black dark:text-white capitalize">{product.deliveryScope === 'nationwide' ? 'Nationwide' : product.deliveryScope || 'Standard'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Cost</span>
                            <span className={`font-medium ${product.free_delivery ? 'text-green-600' : 'text-black dark:text-white'}`}>
                                {product.free_delivery ? 'Free' : formatPrice(product.delivery_cost || 0, product.currency)}
                            </span>
                        </div>
                        {(product.delivery_locations && product.delivery_locations.length > 0) && (
                            <div className="col-span-2 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500 block mb-0.5">Locations</span>
                                <span className="font-medium text-black dark:text-white leading-tight block">
                                    {product.delivery_locations.join(', ')}
                                </span>
                            </div>
                        )}
                        {product.min_order_for_free_delivery && product.min_order_for_free_delivery > 0 && (
                            <div className="col-span-2 text-green-600 font-medium">
                                Free shipping over {formatPrice(product.min_order_for_free_delivery, product.currency)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Shop Info */}
            {product.vendor?.business_name && (
                <div className="bg-surface-light dark:bg-surface-dark p-3 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xs font-bold">
                            {product.vendor.business_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-black dark:text-white">{product.vendor.business_name}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {product.vendor.review_count ? <span>{product.vendor.review_count} reviews</span> : null}
                                {product.vendor.vendor_rating ? <span>{product.vendor.vendor_rating.toFixed(1)} rating</span> : null}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleFollowToggle}
                            disabled={isFollowLoading}
                            className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 ${isFollowing
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                : 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                                }`}
                        >
                            {isFollowLoading ? (
                                <div className="w-3 h-3 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                            ) : (
                                <span className={`material-icons text-sm ${isFollowing ? 'text-emerald-500' : ''}`}>{isFollowing ? 'check_circle' : 'add'}</span>
                            )}
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button
                            onClick={() => onVisitStore?.(product.vendor?.vendor_id || product.seller_id?.toString() || '')}
                            className="border border-black dark:border-white rounded-full px-4 py-1.5 text-xs font-black text-black dark:text-white uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Visit store
                        </button>
                    </div>
                </div>
            )}

            {/* AI Recommendations */}
            <div className="mt-2 space-y-4 pb-8">
                {isLoadingRelated && (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary mb-2"></div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Finding matches...</p>
                    </div>
                )}

                {/* Exact Matches SECTION */}
                {sameItems.length > 0 && !isLoadingRelated && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-3 bg-surface-light dark:bg-surface-dark flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="font-black text-black dark:text-white text-lg uppercase tracking-tight">Exact matches for you</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="material-icons text-shop-red text-sm">auto_awesome</span>
                                    <span className="text-[10px] font-black text-shop-red uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Looks just like yours</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 px-1">
                            {sameItems.map(item => (
                                <ProductCard
                                    key={item.id}
                                    product={item}
                                    onProductClick={() => onProductClick(item)}
                                    onVisualSearch={onVisualSearch}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Use Case Recommendations */}
                {product.use_case_tags && product.use_case_tags.length > 0 && useCaseItems.length > 0 && !isLoadingRelated && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-3 bg-surface-light dark:bg-surface-dark flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="font-black text-black dark:text-white text-lg uppercase tracking-tight">More for {product.use_case_tags[0]}</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="material-icons text-purple-600 text-sm">auto_awesome</span>
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">AI Curated</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto px-3 pb-4 snap-x snap-mandatory hide-scrollbar">
                            {useCaseItems.map(item => (
                                <div key={item.id} className="w-[160px] flex-shrink-0 snap-start">
                                    <ProductCard
                                        product={item}
                                        onProductClick={() => onProductClick(item)}
                                        onVisualSearch={onVisualSearch}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* More to Discover SECTION */}
                {similarItems.length > 0 && !isLoadingRelated && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                        <div className="p-3 bg-surface-light dark:bg-surface-dark flex items-center justify-between mt-4">
                            <div className="flex flex-col">
                                <h3 className="font-black text-black dark:text-white text-lg uppercase tracking-tight">More to discover</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="material-icons text-blue-500 text-sm">style</span>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Picked for your style</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 px-1">
                            {similarItems.map(item => (
                                <ProductCard
                                    key={item.id}
                                    product={item}
                                    onProductClick={() => onProductClick(item)}
                                    onVisualSearch={onVisualSearch}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Fallback Legacy Recommendations if same/similar are empty but we have generic ones */}
                {!isLoadingRelated && sameItems.length === 0 && similarItems.length === 0 && recommendations && recommendations.length > 0 && (
                    <div className="animate-in fade-in duration-500">
                        <div className="p-3 bg-surface-light dark:bg-surface-dark">
                            <h3 className="font-black text-black dark:text-white text-lg uppercase tracking-tight">You may also like</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-1 px-1">
                            {recommendations.slice(0, 6).map(item => (
                                <ProductCard
                                    key={item.id}
                                    product={item}
                                    onProductClick={() => onProductClick(item)}
                                    onVisualSearch={onVisualSearch}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Cart Icon (Bottom Right) */}
            <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-1">
                {product.deliveryText && (
                    <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">{product.deliveryText}</div>
                )}
                <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 relative">
                    <span className="material-icons-outlined text-green-600 text-2xl">shopping_cart</span>
                </div>
            </div>

            {/* Bottom Action Bar - Exact Red Style with Variation Trigger */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 p-2.5 px-4 pb-safe z-50 flex items-center gap-4">
                <div
                    className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-300 px-1 cursor-pointer active:scale-90 transition-transform"
                    onClick={() => onVisitStore?.(product.vendor?.vendor_id || product.seller_id?.toString() || '')}
                >
                    <span className="material-icons-outlined text-[22px]">storefront</span>
                    <span className="text-[10px] font-bold">Shop</span>
                </div>
                <div
                    className="flex flex-col items-center gap-1 text-gray-700 dark:text-gray-300 px-1 cursor-pointer active:scale-90 transition-transform"
                    onClick={handleChatClick}
                >
                    <span className="material-icons-outlined text-[22px]">chat_bubble_outline</span>
                    <span className="text-[10px] font-bold">Chat</span>
                </div>

                <div className="flex-1 flex gap-2">
                    {product.listing_type === 'inquiry' ? (
                        <button
                            className="flex-1 bg-blue-600 text-white font-black rounded-full py-3.5 text-sm shadow-lg shadow-blue-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleChatClick();
                            }}
                        >
                            <span className="material-icons text-sm">chat</span>
                            SEND INQUIRY
                        </button>
                    ) : product.listing_type === 'reservation' ? (
                        <button
                            className="flex-1 bg-emerald-600 text-white font-black rounded-full py-3.5 text-sm shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleChatClick();
                            }}
                        >
                            <span className="material-icons text-sm">event_available</span>
                            RESERVE NOW
                        </button>
                    ) : (
                        <>
                            <button
                                className="flex-1 bg-white dark:bg-black text-red-500 font-bold rounded-full py-3.5 text-sm border-2 border-red-400/30 active:scale-[0.98] transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (productVariants.length > 0) {
                                        setIsVariationSheetOpen(true);
                                    } else {
                                        onAddToCart?.(product);
                                    }
                                }}
                            >
                                Add to cart
                            </button>
                            <button
                                className="flex-1 bg-red-600 text-white font-bold rounded-full py-3.5 text-sm shadow-lg shadow-red-200 dark:shadow-none active:scale-[0.98] transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (productVariants.length > 0) {
                                        setIsVariationSheetOpen(true);
                                    } else {
                                        onBuyNow?.(product);
                                    }
                                }}
                            >
                                Buy now
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Full Screen Image Viewer Overlay */}
            {isImageViewerOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col justify-between animate-in fade-in duration-200">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between p-4 text-white absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <button onClick={(e) => { e.stopPropagation(); setIsImageViewerOpen(false); }}>
                            <span className="material-icons-outlined text-2xl">close</span>
                        </button>
                        <span className="font-bold text-lg">{currentImage + 1}/{images.length}</span>
                        <button>
                            <span className="material-icons-outlined text-2xl">ios_share</span>
                        </button>
                    </div>

                    {/* Main Image/Video Area */}
                    <div className="flex-grow flex items-center justify-center relative w-full h-full bg-black">
                        {/* Check if current image is a video */}
                        {(() => {
                            const currentMedia = product.gallery_media?.[currentImage];
                            const videoUrl = currentMedia?.video_url || currentMedia?.image_url;
                            const isYouTubeVideo = currentMedia?.type === 'youtube'
                                || videoUrl?.includes('youtube.com')
                                || videoUrl?.includes('youtu.be');

                            if (isYouTubeVideo && videoUrl) {
                                // Extract YouTube video ID from common URL shapes (watch, share, embed, shorts)
                                const extractYouTubeId = (url: string) => {
                                    try {
                                        const parsed = new URL(url.replace('youtu.be/', 'youtube.com/watch?v='));
                                        const directId = parsed.searchParams.get('v');
                                        if (directId) return directId;
                                        const path = parsed.pathname.split('/').filter(Boolean);
                                        const embedIdx = path.indexOf('embed');
                                        if (embedIdx >= 0 && path[embedIdx + 1]) return path[embedIdx + 1];
                                        const shortsIdx = path.indexOf('shorts');
                                        if (shortsIdx >= 0 && path[shortsIdx + 1]) return path[shortsIdx + 1];
                                        // fallback: last path segment
                                        return path[path.length - 1];
                                    } catch {
                                        return null;
                                    }
                                };

                                const videoId = extractYouTubeId(videoUrl);

                                if (videoId) {
                                    const embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0&playsinline=1`;
                                    return (
                                        <iframe
                                            src={embedSrc}
                                            className="w-full h-full max-w-screen max-h-screen"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            title="Product video"
                                        />
                                    );
                                }
                            }

                            // Regular image
                            return (
                                <img
                                    src={images[currentImage]}
                                    className="w-full h-auto max-h-screen object-contain"
                                    alt="Full view"
                                />
                            );
                        })()}

                        {/* Click zones for simple navigation (only for images, not videos) */}
                        <div
                            className="absolute inset-y-0 left-0 w-1/3 z-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevImage(e as any);
                            }}
                        />
                        <div
                            className="absolute inset-y-0 right-0 w-1/3 z-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNextImage(e as any);
                            }}
                        />

                        {/* Navigation arrows for images */}
                        {images.length > 1 && (
                            <>
                                {currentImage > 0 && (
                                    <button
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrevImage(e as any);
                                        }}
                                        aria-label="Previous image"
                                    >
                                        <span className="material-icons text-2xl">chevron_left</span>
                                    </button>
                                )}
                                {currentImage < images.length - 1 && (
                                    <button
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNextImage(e as any);
                                        }}
                                        aria-label="Next image"
                                    >
                                        <span className="material-icons text-2xl">chevron_right</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Bottom info overlay inside image area */}
                        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold whitespace-nowrap border border-white/10 z-10">
                            {product.title} - Image {currentImage + 1} of {images.length}
                        </div>
                    </div>

                    {/* Floating Cart (Specific to this view) */}
                    <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-1">
                        <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">Free shipping</div>
                        <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 relative">
                            <span className="material-icons-outlined text-green-600 text-2xl">shopping_cart</span>
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">1</span>
                        </div>
                    </div>

                    {/* Bottom Button Area */}
                    <div className="bg-black p-4 pb-8 z-20">
                        <button className="w-full bg-primary hover:bg-orange-600 text-white font-bold text-lg py-3 rounded-full transition-colors shadow-lg">
                            Add to cart
                        </button>
                    </div>
                </div>
            )}
            {/* Message Sheet Overlay */}
            {isMessageSheetOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-surface-dark rounded-t-3xl p-6 pb-safe animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Message Seller</h3>
                            <button
                                onClick={() => setIsMessageSheetOpen(false)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full"
                            >
                                <span className="material-icons text-xl">close</span>
                            </button>
                        </div>

                        <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl mb-6 border border-gray-100 dark:border-gray-700">
                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                                <img src={product.image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-0.5">Inquiry About</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.title}</div>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Write your message here..."
                                className="w-full h-32 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl p-4 text-sm font-medium resize-none transition-all outline-none text-gray-800 dark:text-white"
                            />
                            <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-400">
                                {messageText.length} characters
                            </div>
                        </div>

                        <button
                            onClick={handleSendMessage}
                            disabled={!messageText.trim() || isSendingMessage}
                            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${!messageText.trim() || isSendingMessage
                                ? 'bg-gray-100 text-gray-400 shadow-none'
                                : 'bg-orange-500 text-white shadow-orange-500/20'
                                }`}
                        >
                            {isSendingMessage ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">send</span>
                                    <span>Send Message</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Variations Bottom Sheet Overlay */}
            {isVariationSheetOpen && (
                <div className="fixed inset-0 z-[70] flex flex-col justify-end animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        onClick={() => setIsVariationSheetOpen(false)}
                    />

                    <div className="relative bg-white dark:bg-surface-dark rounded-t-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-400 shadow-2xl">
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-surface-dark">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Variations</h3>
                            <button
                                onClick={() => setIsVariationSheetOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <span className="material-icons text-gray-400">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            {/* Product Info & Pricing Tiers */}
                            <div className="p-4 flex gap-4">
                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100">
                                    <img src={currentVariant?.image || product.image} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                                        <div className="flex-shrink-0">
                                            <div className="text-lg font-bold text-price-red">{formatPrice(product.price, product.currency)}</div>
                                            <div className="text-[10px] text-gray-500 font-medium">Min. order: 1 piece</div>
                                        </div>
                                        {quantityDiscounts.map((tier, idx) => (
                                            <div key={idx} className="flex-shrink-0 opacity-80">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(tier.unit_price, product.currency)}</div>
                                                <div className="text-[10px] text-gray-500 font-medium">{tier.min_quantity}+ pieces</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Options with exact Alibaba style */}
                            <div className="px-4 pb-32 space-y-6">
                                {productOptions.map((option, optIdx) => (
                                    <div key={option.id} className="space-y-4">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white capitalize">{option.name} ({option.values.length})</h4>
                                            {selectedOptions[option.name] && <span className="text-sm text-gray-400">: {selectedOptions[option.name]}</span>}
                                        </div>

                                        {/* If it's the last option (usually Color/Style), show as list with quantity selectors */}
                                        {optIdx === productOptions.length - 1 ? (
                                            <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-xl overflow-hidden border border-gray-50 dark:border-gray-800">
                                                {option.values.map((val) => {
                                                    const qty = variantQuantities[val] || 0;
                                                    const repImg = productVariants.find(v => v.options && v.options[option.name] === val && v.image)?.image;

                                                    const updateQty = (delta: number) => {
                                                        setVariantQuantities(prev => ({
                                                            ...prev,
                                                            [val]: Math.max(0, (prev[val] || 0) + delta)
                                                        }));
                                                    };

                                                    return (
                                                        <div key={val} className="flex items-center justify-between p-3 border-b border-white dark:border-gray-800 last:border-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                                    <img src={repImg || product.image} className="w-full h-full object-cover" alt="" />
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{val}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => updateQty(-1)}
                                                                    disabled={qty === 0}
                                                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${qty > 0 ? 'border-gray-300 text-gray-800 active:bg-gray-100' : 'border-gray-200 text-gray-300'}`}
                                                                >
                                                                    <span className="material-icons text-lg">remove</span>
                                                                </button>
                                                                <span className="text-sm font-bold min-w-[20px] text-center">{qty}</span>
                                                                <button
                                                                    onClick={() => updateQty(1)}
                                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-800 active:bg-gray-100 shadow-sm transition-all"
                                                                >
                                                                    <span className="material-icons text-lg">add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* Higher level options (like Model Number) shown as pills with red badge count */
                                            <div className="flex flex-wrap gap-2.5">
                                                {option.values.map((val) => {
                                                    const isSelected = selectedOptions[option.name] === val;
                                                    const totalForOption = Object.entries(variantQuantities).length > 0 ? '3' : null; // Mocking small red badge as in image

                                                    return (
                                                        <div key={val} className="relative">
                                                            <button
                                                                onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: val }))}
                                                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${isSelected
                                                                    ? 'border-price-red text-price-red bg-red-50/50'
                                                                    : 'border-gray-200 text-gray-500 bg-white'
                                                                    }`}
                                                            >
                                                                {val}
                                                            </button>
                                                            {isSelected && (
                                                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-price-red rounded-full flex items-center justify-center text-[9px] text-white font-bold border-2 border-white">
                                                                    3
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer exactly as pictured */}
                        <div className="bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800">
                            <div className="px-4 py-3 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-900 dark:text-white">Item subtotal</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-black text-gray-900 dark:text-white">
                                        {formatPrice((Object.values(variantQuantities) as number[]).reduce((a, b) => a + b, 0) * (currentVariant?.price || product.price), product.currency)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">({formatPrice(currentVariant?.price || product.price, product.currency)}/piece)</span>
                                    <span className="material-icons text-gray-400 text-lg">keyboard_arrow_up</span>
                                </div>
                            </div>

                            <div className="p-4 pt-1 flex gap-3 items-center">
                                <button
                                    className="p-3 border border-gray-200 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                    onClick={handleChatClick}
                                >
                                    <span className="material-icons-outlined text-gray-600">chat_bubble_outline</span>
                                </button>
                                {product.listing_type === 'inquiry' ? (
                                    <button
                                        className="flex-1 bg-blue-600 text-white font-black rounded-full py-3.5 text-sm shadow-lg shadow-blue-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        onClick={() => {
                                            handleChatClick();
                                            setIsVariationSheetOpen(false);
                                        }}
                                    >
                                        <span className="material-icons text-sm">chat</span>
                                        SEND INQUIRY
                                    </button>
                                ) : product.listing_type === 'reservation' ? (
                                    <button
                                        className="flex-1 bg-emerald-600 text-white font-black rounded-full py-3.5 text-sm shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        onClick={() => {
                                            handleChatClick();
                                            setIsVariationSheetOpen(false);
                                        }}
                                    >
                                        <span className="material-icons text-sm">event_available</span>
                                        RESERVE NOW
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className="flex-1 bg-white border border-gray-900 dark:border-white text-gray-900 dark:text-white font-black rounded-full py-3.5 text-sm active:scale-[0.98] transition-all"
                                            onClick={() => {
                                                const selectedVariants = (Object.entries(variantQuantities) as [string, number][]).filter(([_, qty]) => qty > 0);

                                                if (selectedVariants.length > 0) {
                                                    selectedVariants.forEach(([val, qty]) => {
                                                        const variant = productVariants.find(v => v.options && Object.values(v.options).includes(val));
                                                        if (variant) {
                                                            onAddToCart?.({
                                                                ...product,
                                                                variant_id: variant.id,
                                                                price: variant.price,
                                                                title: `${product.title} - ${val}`,
                                                                image: variant.image || product.image
                                                            }, qty);
                                                        }
                                                    });
                                                } else {
                                                    // Fallback to current variant or main product
                                                    const productToAdd = currentVariant
                                                        ? { ...product, variant_id: currentVariant.id, price: currentVariant.price, title: `${product.title} - ${Object.values(currentVariant.options).join('/')}` }
                                                        : product;
                                                    onAddToCart?.(productToAdd, 1);
                                                }
                                                setIsVariationSheetOpen(false);
                                            }}
                                        >
                                            Add to cart
                                        </button>
                                        <button
                                            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black rounded-full py-3.5 text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
                                            onClick={() => {
                                                const selectedVariants = (Object.entries(variantQuantities) as [string, number][]).filter(([_, qty]) => qty > 0);
                                                if (selectedVariants.length > 0) {
                                                    selectedVariants.forEach(([val, qty]) => {
                                                        const variant = productVariants.find(v => v.options && Object.values(v.options).includes(val));
                                                        if (variant) {
                                                            onBuyNow?.({
                                                                ...product,
                                                                variant_id: variant.id,
                                                                price: variant.price,
                                                                title: `${product.title} - ${val}`,
                                                                image: variant.image || product.image
                                                            }, qty);
                                                        }
                                                    });
                                                } else {
                                                    const productToAdd = currentVariant
                                                        ? { ...product, variant_id: currentVariant.id, price: currentVariant.price, title: `${product.title} - ${Object.values(currentVariant.options).join('/')}` }
                                                        : product;
                                                    onBuyNow?.(productToAdd, 1);
                                                }
                                                setIsVariationSheetOpen(false);
                                            }}
                                        >
                                            Start order
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

