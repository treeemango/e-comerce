import React from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductOption, ProductVariant, ProductReviewSummary } from '../types';
import { getCurrencySymbol } from '@/lib/currency';
import { fetchProductVariants, fetchProductReviewSummary } from '@/lib/api';

interface PreviewModalProps {
  product: Product;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ product, onClose }) => {
  // Prevent scrolling on body when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const [productOptions, setProductOptions] = React.useState<ProductOption[]>(product.options || []);
  const [productVariants, setProductVariants] = React.useState<ProductVariant[]>(product.variants || []);
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = React.useState<ProductVariant | null>(null);
  const [reviewSummary, setReviewSummary] = React.useState<ProductReviewSummary | null>(null);

  // Fetch options/variants if the card payload did not include them
  React.useEffect(() => {
    setProductOptions(product.options || []);
    setProductVariants(product.variants || []);
  }, [product.options, product.variants]);

  React.useEffect(() => {
    let isMounted = true;

    if (!product.id) return;
    const alreadyLoaded = productOptions.length > 0 || productVariants.length > 0;
    if (alreadyLoaded) return;

    const loadVariants = async () => {
      const { variants, options } = await fetchProductVariants(product.id.toString());
      if (!isMounted) return;
      setProductOptions(options);
      setProductVariants(variants);
    };

    loadVariants();

    return () => {
      isMounted = false;
    };
  }, [product.id, productOptions.length, productVariants.length]);

  React.useEffect(() => {
    if ((productOptions || []).length === 0 || Object.keys(selectedOptions).length > 0) return;
    const defaults: Record<string, string> = {};
    productOptions.forEach(opt => {
      if (opt.values.length > 0) {
        defaults[opt.name] = opt.values[0];
      }
    });
    setSelectedOptions(defaults);
  }, [productOptions, selectedOptions]);

  // Keep current variant in sync with selected options
  React.useEffect(() => {
    if (productVariants.length === 0 || Object.keys(selectedOptions).length === 0) {
      setCurrentVariant(null);
      return;
    }

    const matched = productVariants.find(v => {
      if (!v.options) return false;
      return Object.entries(selectedOptions).every(([key, value]) => v.options?.[key] === value);
    });

    setCurrentVariant(matched || null);
  }, [productVariants, selectedOptions]);

  // Load fresh review data for accurate counts
  React.useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      if (!product.id) return;
      const summary = await fetchProductReviewSummary(product.id.toString());
      if (isMounted && summary) {
        setReviewSummary(summary);
      }
    };

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [product.id]);

  const currencyCode = product.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currencyCode);
  const displayPrice = currentVariant?.price ?? product.price;
  const backendRrp = product.originalPrice ?? product.rrp;
  const derivedRrp = !backendRrp && typeof product.discountPercent === 'number'
    ? Number((displayPrice / (1 - product.discountPercent / 100)).toFixed(2))
    : backendRrp;
  const displayRRP = derivedRrp || null;
  const hasDiscount = typeof displayRRP === 'number' && displayRRP > displayPrice;
  const discountPercent = typeof product.discountPercent === 'number'
    ? Math.round(product.discountPercent)
    : hasDiscount
      ? Math.round(((displayRRP - displayPrice) / displayRRP) * 100)
      : null;
  const ratingValue = typeof (reviewSummary?.average_rating ?? product.rating) === 'number' ? (reviewSummary?.average_rating ?? product.rating) : 0;
  const reviewsCount = reviewSummary?.total_reviews ?? product.reviews ?? 0;
  const soldLabel = product.vendor?.completed_orders
    ? `${product.vendor.completed_orders.toLocaleString()} orders`
    : product.stock
      ? `${product.stock.toLocaleString()} in stock`
      : 'Popular item';

  const colorOption = React.useMemo(() => (productOptions || []).find(opt => opt.name.toLowerCase().includes('color')), [productOptions]);
  const nonColorOptions = React.useMemo(
    () => (productOptions || []).filter(opt => opt.name !== colorOption?.name),
    [productOptions, colorOption]
  );

  const variantMedia = React.useMemo(() => {
    return productVariants
      .filter(v => v.image)
      .map((v, idx) => ({
        id: `variant-${v.id || idx}`,
        type: 'image' as const,
        url: v.image as string,
        thumbnail: v.image as string,
        isMain: false
      }));
  }, [productVariants]);

  // Prepare media list: prioritize videos, then images, then variant images. Fallback to main image if no media.
  const mediaList = React.useMemo(() => {
    const baseMedia = product.media && product.media.length > 0 ? [...product.media] : [];
    const fallbackImage = product.image || productVariants.find(v => v.image)?.image;

    // Deduplicate by URL when merging variant images
    const mergedImages = [...baseMedia];
    variantMedia.forEach(vm => {
      if (!mergedImages.some(m => m.url === vm.url)) mergedImages.push(vm);
    });

    if (mergedImages.length > 0) {
      return mergedImages
        .filter(m => m.url)
        .sort((a, b) => {
          if (a.type === 'video' || a.type === 'youtube') return -1;
          if (b.type === 'video' || b.type === 'youtube') return 1;
          return 0;
        });
    }

    return fallbackImage ? [{ type: 'image', url: fallbackImage, id: 0, isMain: true }] : [];
  }, [product, variantMedia, productVariants]);

  const activeMedia = mediaList[activeMediaIndex];

  // When a variant with an image is selected, auto-focus its media if present
  React.useEffect(() => {
    if (!currentVariant?.image) return;
    const idx = mediaList.findIndex(m => m.url === currentVariant.image);
    if (idx >= 0) {
      setActiveMediaIndex(idx);
    }
  }, [currentVariant?.image, mediaList]);

  const handleOptionSelect = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const getVariantImageForOption = (optionName: string, optionValue: string) => {
    const match = productVariants.find(v => v.options?.[optionName] === optionValue && v.image);
    return match?.image;
  };

  const getColorThumbnail = (value: string) => {
    return (
      getVariantImageForOption(colorOption?.name || 'Color', value) ||
      product.media?.[0]?.url ||
      product.image
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl mx-auto z-50 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 p-2 bg-white/50 dark:bg-black/50 rounded-full"
        >
          <span className="material-icons">close</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Media Gallery */}
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {/* Main Media View */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                {activeMedia.type === 'youtube' ? (
                  <iframe
                    src={`${activeMedia.url}?autoplay=1&mute=0&controls=1&loop=1`}
                    className="w-full h-full object-cover"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : activeMedia.type === 'video' ? (
                  <video
                    src={activeMedia.url}
                    className="w-full h-full object-contain bg-black"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    alt={product.title}
                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                    src={activeMedia.url}
                  />
                )}
              </div>

              {/* Thumbnails */}
              {mediaList.length > 1 && (
                <div className="grid grid-cols-6 gap-2 overflow-x-auto pb-2">
                  {mediaList.map((media: any, i: number) => (
                    <div
                      key={media.id || i}
                      onClick={() => setActiveMediaIndex(i)}
                      className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${i === activeMediaIndex
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      {(media.type === 'video' || media.type === 'youtube') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                          <span className="material-icons text-white text-lg drop-shadow-md">play_circle</span>
                        </div>
                      )}
                      <img
                        alt={`Thumbnail ${i}`}
                        className="w-full h-full object-cover"
                        src={media.thumbnail || media.url}
                        onError={(e) => {
                          // Fallback for video thumbnails if not provided
                          if (media.type === 'youtube') {
                            // Try to get youtube thumbnail
                            const videoId = media.url.split('embed/')[1]?.split('?')[0];
                            if (videoId) (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="p-6 flex flex-col">
            <div className="flex-grow">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {product.title}
              </h1>

              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="material-icons text-yellow-400 text-base">star</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{ratingValue.toFixed(1)}</span>
                </div>
                <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
                <span>{reviewsCount} Reviews</span>
                <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
                <span>{soldLabel}</span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{currencySymbol}{displayPrice.toFixed(2)}</span>
                {hasDiscount && (
                  <span className="text-lg text-gray-400 line-through">{currencySymbol}{displayRRP?.toFixed(2)}</span>
                )}
                {discountPercent !== null && (
                  <span className="bg-primary/10 text-primary text-sm font-semibold px-2 py-1 rounded">{discountPercent}% off</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tax excluded, add at checkout if applicable</p>

              {product.activeCoupon && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between text-sm cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">%</span>
                    <span className="text-red-700 dark:text-red-300">
                      {product.activeCoupon.amount ? `Save ${currencySymbol}${product.activeCoupon.amount} today` : product.activeCoupon.percent ? `${product.activeCoupon.percent}% off with code ${product.activeCoupon.code}` : product.activeCoupon.label}
                    </span>
                  </div>
                  <span className="material-icons text-gray-400 text-lg">chevron_right</span>
                </div>
              )}

              {colorOption && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Color: <span className="text-gray-500 font-normal">{selectedOptions[colorOption.name] || colorOption.values[0]}</span></p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {colorOption.values.map((value) => {
                      const thumb = getColorThumbnail(value);
                      const isActive = selectedOptions[colorOption.name] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => handleOptionSelect(colorOption.name, value)}
                          className={`relative w-14 h-14 rounded-md border-2 overflow-hidden transition-all ${isActive
                            ? 'border-red-500 ring-2 ring-red-200'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                            }`}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={value}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-xs text-gray-500">{value}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {nonColorOptions.map(option => {
                const isSize = option.name.toLowerCase().includes('size');
                return (
                  <div className="mt-6" key={option.id || option.name}>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.name}</p>
                      {isSize && <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Size Chart</a>}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-sm">
                      {option.values.map((val) => {
                        const isActive = selectedOptions[option.name] === val;
                        const baseStyles = 'py-2 px-3 border rounded-md transition-colors';
                        const activeStyles = isSize
                          ? 'border-red-500 bg-red-50 text-red-600 font-medium'
                          : 'border-primary bg-primary/5 text-primary font-medium';
                        const inactiveStyles = 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400';
                        return (
                          <button
                            key={val}
                            onClick={() => handleOptionSelect(option.name, val)}
                            className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
              <div className="flex flex-col gap-3">
                <button className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">
                  Add to cart
                </button>
                <div className="flex items-center gap-3">
                  <button className="flex-1 text-center py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors">
                    View details
                  </button>
                  <button className="flex items-center justify-center gap-2 flex-1 text-center py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors">
                    <span className="material-icons text-lg text-gray-400">favorite_border</span>
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PreviewModal;
