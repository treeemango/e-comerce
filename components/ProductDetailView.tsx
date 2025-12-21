
import React, { useState, useEffect, useMemo } from 'react';
import { Product, GalleryMediaItem, User, Breadcrumb, VisualCategory, ProductOption, ProductVariant, PromoCoupon, QuantityDiscountTier } from '../types';
import ProductCard from './ProductCard';
import { fetchRelatedProducts, RelatedProduct, fetchCategoryName, toggleFollowStore, getFollowStatus, fetchProductVariants, getProductCoupons, claimCoupon, fetchVendorInfo, fetchQuantityDiscounts } from '../lib/api';
import { trackProductViewAuto } from '../lib/tracking';
import { ReviewSection } from './ReviewSection';
import { playFollowSound, playUnfollowSound } from '../lib/sounds';
import { useSEO } from '../lib/useSEO';
import { generateProductSchema, generateBreadcrumbSchema, getProductPageSEO, SITE_CONFIG } from '../lib/seo-utils';
import { formatPrice, getCurrencySymbol } from '../lib/currency';
import ImageMagnifier from './ImageMagnifier';

interface ProductDetailViewProps {
   product: Product;
   onProductClick?: (product: Product) => void;
   onAddToCart?: (product: Product) => void;
   user?: User | null;
   onVisitStore?: (vendorId: string) => void;
   breadcrumbs?: Breadcrumb[];
   onHomeClick?: () => void;
   onCategoryClick?: (categoryIds: string[], title: string, subcategories?: VisualCategory[], newBreadcrumbs?: Breadcrumb[]) => void;
   onRelatedProductClick?: (product: Product) => void;
   onMessageSeller?: (product: Product, initialMessage?: string) => void;
}

interface MediaItem {
   id: string;
   image_url?: string;
   thumbnail_url?: string;
   is_main?: boolean;
   type: 'image' | 'video' | 'youtube';
   video_url?: string;
   alt_text?: string;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
   product,
   onProductClick,
   onAddToCart,
   user,
   onVisitStore,
   breadcrumbs: propBreadcrumbs,
   onHomeClick,
   onCategoryClick,
   onRelatedProductClick,
   onMessageSeller
}) => {
   const [sameItems, setSameItems] = useState<RelatedProduct[]>([]);
   const [similarItems, setSimilarItems] = useState<RelatedProduct[]>([]);
   const [isLoadingRelated, setIsLoadingRelated] = useState(false);
   const [activeMediaIndex, setActiveMediaIndex] = useState(0);
   const [hoverPreviewMedia, setHoverPreviewMedia] = useState<MediaItem | null>(null);
   const [userHasSelected, setUserHasSelected] = useState(false);
   const [isFollowing, setIsFollowing] = useState(false);
   const [isFollowLoading, setIsFollowLoading] = useState(false);
   const [followerCount, setFollowerCount] = useState(0);

   // Message Modal State
   const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
   const [initialMessage, setInitialMessage] = useState('');

   // Variants State
   const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
   const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);

   // Variants State
   const [productOptions, setProductOptions] = useState<ProductOption[]>(product.options || []);
   const [productVariants, setProductVariants] = useState<ProductVariant[]>(product.variants || []);
   const [isLoadingVariants, setIsLoadingVariants] = useState(false);

   const [resolvedVendor, setResolvedVendor] = useState(product.vendor);

   // Coupon State
   const [productCoupons, setProductCoupons] = useState<PromoCoupon[]>([]);
   const [claimedCoupons, setClaimedCoupons] = useState<Set<string>>(new Set());
   const [quantityDiscounts, setQuantityDiscounts] = useState<QuantityDiscountTier[]>([]);

   useEffect(() => {
      const loadCoupons = async () => {
         if (product.id) {
            const coupons = await getProductCoupons(product.id.toString());

            // Deduplicate coupons
            const uniqueCoupons = Array.from(new Map(coupons.map((c: PromoCoupon) => [c.id, c])).values()) as PromoCoupon[];

            // Filter for valid ongoing coupons
            const validCoupons = uniqueCoupons.filter((c: PromoCoupon) => c.status === 'Ongoing');
            setProductCoupons(validCoupons);
         }
      };
      loadCoupons();
   }, [product.id]);

   useEffect(() => {
      const loadQuantityDiscounts = async () => {
         if (product.id && product.has_quantity_discount) {
            const tiers = await fetchQuantityDiscounts(product.id.toString());
            setQuantityDiscounts(tiers);
         }
      };
      loadQuantityDiscounts();
   }, [product.id, product.has_quantity_discount]);

   const handleClaimCoupon = async (couponId: string) => {
      if (!user) {
         alert("Please login to claim coupons");
         return;
      }
      const success = await claimCoupon(couponId, user.id);
      if (success) {
         alert("Coupon claimed successfully!");
         setClaimedCoupons(prev => new Set(prev).add(couponId));
      } else {
         alert("Failed to claim coupon or already claimed.");
      }
   };

   useEffect(() => {
      const loadVariants = async () => {
         if (product.id) {
            // Check if we need to fetch
            const needsFetch = !product.variants || product.variants.length === 0;

            if (needsFetch) {
               setIsLoadingVariants(true);
               const { variants, options } = await fetchProductVariants(product.id.toString());
               setProductVariants(variants);
               setProductOptions(options);

               // Initialize defaults from fetched options
               if (options.length > 0 && Object.keys(selectedOptions).length === 0) {
                  const defaults: Record<string, string> = {};
                  options.forEach(opt => {
                     defaults[opt.name] = opt.values[0];
                  });
                  setSelectedOptions(defaults);
               }
               setIsLoadingVariants(false);
            } else {
               // Use props
               if (productOptions.length > 0 && Object.keys(selectedOptions).length === 0) {
                  const defaults: Record<string, string> = {};
                  productOptions.forEach(opt => {
                     defaults[opt.name] = opt.values[0];
                  });
                  setSelectedOptions(defaults);
               }
            }
         }
      };
      loadVariants();
   }, [product.id, product.variants]);

   // Update current variant based on selection
   useEffect(() => {
      if (productVariants.length > 0) {
         const matched = productVariants.find(v => {
            // Check if every selected option matches the variant's options
            // Note: v.options is Record<string, string>
            return Object.entries(selectedOptions).every(([k, val]) => v.options && v.options[k] === val);
         });
         setCurrentVariant(matched || null);

         // If main image changes due to variant, could update here
         // (Optional: if variant has specific image, set active media)
         if (matched?.image && matched.image !== product.image) {
            // Logic to switch view to variant image could go here
            // But for now we just rely on the render updating if we used it.
         }
      }
   }, [selectedOptions, productVariants]);

   const currencyCode = product.currency || 'USD';
   const currencySymbol = getCurrencySymbol(currencyCode);

   // Price/discount logic from backend with safe fallbacks
   const displayPrice = useMemo(() => {
      if (currentVariant) return currentVariant.price;
      return product.price;
   }, [product.price, currentVariant]);

   const displayRRP = useMemo(() => {
      const backendRrp = product.originalPrice ?? product.rrp;
      if (typeof backendRrp === 'number' && backendRrp > 0) return backendRrp;
      return null; // avoid fake RRPs to prevent misleading discounts
   }, [product.originalPrice, product.rrp]);

   useEffect(() => {
      setResolvedVendor(product.vendor);
   }, [product.vendor]);

   useEffect(() => {
      const hydrateVendor = async () => {
         if (resolvedVendor) return;
         if (!product.id) return;
         const vendorMap = await fetchVendorInfo([product.id.toString()]);
         const candidateKeys = [product.seller_id, product.vendor?.vendor_id]
            .filter(Boolean)
            .map(k => k!.toString());

         let vendor = undefined;
         for (const key of candidateKeys) {
            vendor = vendorMap.get(key);
            if (vendor) break;
         }

         // Fallback: take any vendor if map has entries
         if (!vendor && vendorMap.size > 0) {
            vendor = vendorMap.values().next().value;
         }

         if (vendor) {
            setResolvedVendor(vendor);
         }
      };

      hydrateVendor();
   }, [product.id, product.seller_id, product.vendor, resolvedVendor]);

   const discountPercent = useMemo(() => {
      if (typeof product.discountPercent === 'number') return Math.round(product.discountPercent);
      if (displayRRP && displayRRP > displayPrice) {
         return Math.round(((displayRRP - displayPrice) / displayRRP) * 100);
      }
      return null;
   }, [displayPrice, displayRRP, product.discountPercent]);

   const promoLine = useMemo(() => {
      if (product.promoText) return product.promoText;
      if (product.promoCode) return `Extra 15% off orders $49+ with code: ${product.promoCode}`;
      return null;
   }, [product.promoCode, product.promoText]);

   const showPromo = Boolean(promoLine);

   const ratingValue = typeof product.rating === 'number' ? product.rating : null;
   const formattedRating = ratingValue !== null ? ratingValue.toFixed(1) : '—';
   const vendor = resolvedVendor ?? product.vendor;
   const soldLabel = useMemo(() => {
      if (typeof product.stock === 'number') return `${product.stock.toLocaleString()} in stock`;
      if (resolvedVendor?.completed_orders) return `${resolvedVendor.completed_orders.toLocaleString()} orders`;
      return 'Popular item';
   }, [product.stock, resolvedVendor?.completed_orders]);

   // Generate styles for known color names
   const getColorStyle = (colorName: string) => {
      const name = colorName.toLowerCase();
      if (name === 'midnight') return '#191f2e';
      if (name === 'starlight') return '#f0fcf8';
      return name; // fallback to css name
   };

   const colorOptionName = useMemo(() => productOptions.find(opt => /color|colour/i.test(opt.name))?.name, [productOptions]);

   const colorCards = useMemo(() => {
      if (!colorOptionName) return [] as { label: string; variant: ProductVariant }[];
      const seen = new Set<string>();
      const cards: { label: string; variant: ProductVariant }[] = [];
      productVariants.forEach(variant => {
         const label = variant.options?.[colorOptionName];
         if (label && !seen.has(label)) {
            seen.add(label);
            cards.push({ label, variant });
         }
      });
      return cards;
   }, [colorOptionName, productVariants]);

   const findVariantFor = (overrides: Record<string, string>) => {
      const preview = { ...selectedOptions, ...overrides };
      return productVariants.find(v => Object.entries(preview).every(([k, val]) => v.options?.[k] === val))
         || productVariants.find(v => Object.entries(overrides).every(([k, val]) => v.options?.[k] === val));
   };

   const displayedOptions = useMemo(() => productOptions.filter(opt => opt.name !== colorOptionName), [productOptions, colorOptionName]);
   // Reset user selection when product changes
   useEffect(() => {
      setUserHasSelected(false);
   }, [product.id]);

   useEffect(() => {
      const loadRelated = async () => {
         if (product?.id) {
            setIsLoadingRelated(true);
            const { same, similar } = await fetchRelatedProducts(product.id.toString());
            setSameItems(same);
            setSimilarItems(similar);
            setIsLoadingRelated(false);
         }
      };
      loadRelated();
   }, [product.id]);

   useEffect(() => {
      if (product?.id) {
         trackProductViewAuto(product.id);
      }
   }, [product.id]);

   // Check if user is following this store
   useEffect(() => {
      const checkFollowStatus = async () => {
         if (vendor?.vendor_id && user?.id) {
            const status = await getFollowStatus(user.id, vendor.vendor_id);
            if (status) {
               setIsFollowing(status.is_following);
               setFollowerCount(status.follower_count);
            }
         } else {
            setIsFollowing(false);
            setFollowerCount(0);
         }
      };
      checkFollowStatus();
   }, [vendor?.vendor_id, user?.id]);

   const handleMessageClick = () => {
      if (!user) {
         // If not logged in, trigger default action which usually prompts login
         if (onMessageSeller) onMessageSeller(product);
         return;
      }
      setIsMessageModalOpen(true);
      setInitialMessage(`Hi, I'm interested in your ${product.title}...`);
   };

   const handleConfirmSendMessage = () => {
      if (onMessageSeller) {
         onMessageSeller(product, initialMessage);
      }
      setIsMessageModalOpen(false);
   };

   const handleFollowToggle = async () => {
      if (!vendor?.vendor_id) return;

      if (!user) {
         alert('Please sign in to follow stores');
         return;
      }

      setIsFollowLoading(true);

      try {
         const result = await toggleFollowStore(user.id, vendor.vendor_id);
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

   // Get gallery media from product
   const galleryMedia: MediaItem[] = Array.isArray(product.gallery_media)
      ? product.gallery_media.filter(item => item && !item.is_main && ((item.type === 'image' && item.image_url) || ((item.type === 'video' || item.type === 'youtube') && item.video_url)))
      : [];

   const normalizeYoutubeThumb = (item: MediaItem) => {
      if (item.type === 'youtube' && !item.thumbnail_url && item.video_url?.includes('/embed/')) {
         const videoId = item.video_url.split('/embed/')[1];
         if (videoId) {
            item.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
         }
      }
      return item;
   };

   const baseMediaItems: MediaItem[] = [
      {
         id: 'featured',
         image_url: product.image,
         thumbnail_url: product.image,
         is_main: true,
         type: 'image' as const,
         alt_text: product.title
      },
      ...galleryMedia
   ].filter(item => item && ((item.type === 'image' && item.image_url) || ((item.type === 'video' || item.type === 'youtube') && item.video_url)))
      .map(normalizeYoutubeThumb);

   const selectedColorLabel = colorOptionName ? selectedOptions[colorOptionName] : undefined;

   const colorMatch = (media: MediaItem, color?: string) => {
      if (!color) return false;
      const haystack = `${media.alt_text || ''} ${media.image_url || ''} ${media.thumbnail_url || ''}`.toLowerCase();
      return haystack.includes(color.toLowerCase());
   };

   const uniqueMedia = (items: MediaItem[]) => {
      const seen = new Set<string>();
      return items.filter(item => {
         const key = `${item.type}-${item.image_url || item.video_url || item.thumbnail_url}`;
         if (seen.has(key)) return false;
         seen.add(key);
         return true;
      });
   };

   const variantShowcaseMedia: MediaItem[] = useMemo(() => {
      const prioritized: MediaItem[] = [];

      if (currentVariant?.image) {
         prioritized.push({
            id: `variant-${currentVariant.id}`,
            image_url: currentVariant.image,
            thumbnail_url: currentVariant.image,
            type: 'image',
            alt_text: `${product.title} ${selectedColorLabel || ''}`.trim()
         });
      }

      const filteredByColor = baseMediaItems.filter(m => colorMatch(m, selectedColorLabel));
      const remaining = baseMediaItems.filter(m => !colorMatch(m, selectedColorLabel));

      const merged = uniqueMedia([...prioritized, ...filteredByColor, ...remaining]);
      return merged.length > 0 ? merged : baseMediaItems;
   }, [baseMediaItems, currentVariant?.id, currentVariant?.image, product.title, selectedColorLabel]);

   useEffect(() => {
      // When user changes color/variant, reset to first media so the new variant hero is shown
      setActiveMediaIndex(0);
   }, [selectedColorLabel, currentVariant?.id]);

   // Auto-select first video on page load (only if user hasn't manually selected)
   useEffect(() => {
      if (variantShowcaseMedia.length > 0 && !userHasSelected) {
         const videoIndex = variantShowcaseMedia.findIndex(item => item.type === 'video' || item.type === 'youtube');
         if (videoIndex >= 0) {
            setActiveMediaIndex(videoIndex);
         }
      }
   }, [variantShowcaseMedia, userHasSelected]);

   const activeMedia = variantShowcaseMedia[activeMediaIndex] || variantShowcaseMedia[0];
   const effectiveActiveMedia = hoverPreviewMedia ?? activeMedia;

   // Generate dynamic breadcrumbs from product category data
   const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

   useEffect(() => {
      // If breadcrumbs are passed from props (e.g. from navigation), use them and append product
      if (propBreadcrumbs && propBreadcrumbs.length > 0) {
         // Check if product is already in breadcrumbs
         const lastCrumb = propBreadcrumbs[propBreadcrumbs.length - 1];
         if (lastCrumb.label !== product.title) {
            const productCrumb: Breadcrumb = { label: product.title, type: 'subcategory', id: product.id };
            setBreadcrumbs([...propBreadcrumbs, productCrumb]);
         } else {
            setBreadcrumbs(propBreadcrumbs);
         }
         return;
      }

      // Fallback: Generate local breadcrumbs if not provided
      const loadBreadcrumbs = async () => {
         const crumbs: Breadcrumb[] = [{ label: 'Home', type: 'home' }];

         // Category Logic
         let categoryName = 'Products';
         let categoryId = '';

         if (product.categoryName) {
            categoryName = product.categoryName;
            categoryId = product.categoryId || '';
         } else if (product.categoryId) {
            const fetchedName = await fetchCategoryName(product.categoryId);
            if (fetchedName && fetchedName !== 'Products') {
               categoryName = fetchedName;
            } else {
               categoryName = `Category ${product.categoryId}`;
            }
            categoryId = product.categoryId;
         } else if (product.category && typeof product.category === 'string') {
            categoryName = product.category.replace(/[{}\[\]""]/g, '').trim() || 'Products';
         }

         // Add Category Crumb
         crumbs.push({
            label: categoryName,
            type: 'category',
            id: categoryId,
            data: {
               title: categoryName,
               categoryIds: categoryId ? [categoryId] : []
            }
         });

         // Add Product Title
         if (product.title) {
            const title = product.title.length > 50
               ? product.title.substring(0, 47) + '...'
               : product.title;
            crumbs.push({ label: title, type: 'subcategory', id: product.id });
         }

         setBreadcrumbs(crumbs);
      };

      loadBreadcrumbs();
   }, [product.categoryId, product.categoryName, product.category, product.title, propBreadcrumbs]);


   // SEO: Compute page metadata and structured data for product
   const productSeoConfig = useMemo(() => {
      const seoConfig = getProductPageSEO(product, vendor);
      const schemas = [];
      schemas.push(generateProductSchema(product, vendor));

      if (breadcrumbs.length > 0) {
         const breadcrumbUrls = breadcrumbs.map((crumb) => ({
            name: crumb.label,
            url: crumb.type === 'category' && crumb.id ? `${SITE_CONFIG.url}/category/${crumb.id}` :
               crumb.type === 'subcategory' && crumb.id ? `${SITE_CONFIG.url}/product/${crumb.id}` : SITE_CONFIG.url
         }));
         schemas.push(generateBreadcrumbSchema(breadcrumbUrls));
      }

      return {
         ...seoConfig,
         structuredData: schemas,
         structuredDataId: 'product-detail-seo'
      };
   }, [product.id, product.title, product.price, product.image, vendor, breadcrumbs]);

   // Apply SEO configuration (hook called at top level)
   useSEO(productSeoConfig);

   return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 animate-in fade-in zoom-in duration-300">
         <nav className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, i) => (
               <React.Fragment key={i}>
                  <span
                     className={`hover:underline cursor-pointer hover:text-primary ${i === breadcrumbs.length - 1 ? 'font-semibold text-slate-700 dark:text-slate-300' : ''}`}
                     onClick={() => {
                        if (i === breadcrumbs.length - 1) return;

                        if (crumb.type === 'home' && onHomeClick) {
                           onHomeClick();
                        } else if (crumb.type === 'category' && onCategoryClick) {
                           // Use stored data or fallback
                           const catIds = crumb.data?.categoryIds || (crumb.id ? [crumb.id] : []);
                           const title = crumb.data?.title || crumb.label;
                           // We slice breadcrumbs to go back
                           const newCrumbs = breadcrumbs.slice(0, i + 1);
                           onCategoryClick(catIds, title, crumb.data?.visualCategories || [], newCrumbs);
                        }
                     }}
                  >
                     {crumb.label}
                  </span>
                  {i < breadcrumbs.length - 1 && <span className="material-icons text-[10px]">chevron_right</span>}
               </React.Fragment>
            ))}
         </nav>

         <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-[45%] flex gap-4">
               <div className="flex flex-col gap-3 w-16 flex-shrink-0 max-h-[440px] overflow-y-auto scrollbar-hide relative z-50">
                  {variantShowcaseMedia.map((media, i) => (
                     <div
                        key={media.id || i}
                        className={`aspect-square rounded-xl border cursor-pointer overflow-hidden relative pointer-events-auto transition-all duration-200 ${i === activeMediaIndex ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/40' : 'border-slate-200 dark:border-slate-700 hover:border-orange-200'}`}
                        onMouseEnter={() => {
                           setActiveMediaIndex(i);
                           setUserHasSelected(true);
                        }}
                     >
                        <img
                           src={media.thumbnail_url || media.image_url}
                           alt={media.alt_text || `Product thumbnail ${i + 1}`}
                           className="w-full h-full object-cover"
                           loading="lazy"
                        />
                        {(media.type === 'youtube' || media.type === 'video') && (
                           <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="material-icons text-white text-2xl">play_circle</span>
                           </div>
                        )}
                        {selectedColorLabel && i === 0 && (
                           <div className="absolute top-1 right-1 bg-white/90 dark:bg-black/70 text-[10px] font-semibold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200 shadow-sm">
                              {selectedColorLabel}
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               <div className="flex-1 relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-sm">
                  {effectiveActiveMedia.type === 'youtube' ? (
                     <div className="w-full h-full bg-black flex items-center justify-center">
                        <iframe
                           src={`${effectiveActiveMedia.video_url}?mute=1&autoplay=1&modestbranding=1&rel=0`}
                           title="Product video"
                           className="w-full h-full"
                           frameBorder="0"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        />
                     </div>
                  ) : effectiveActiveMedia.type === 'video' ? (
                     <video
                        src={effectiveActiveMedia.video_url}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        poster={effectiveActiveMedia.thumbnail_url || effectiveActiveMedia.image_url}
                     >
                        Your browser does not support the video tag.
                     </video>
                  ) : (
                     <div className="w-full h-full flex items-center justify-center p-3 bg-white dark:bg-slate-900">
                        <ImageMagnifier
                           src={effectiveActiveMedia.image_url!}
                           alt={effectiveActiveMedia.alt_text || product.title}
                           className="w-full h-full flex items-center justify-center"
                        />
                     </div>
                  )}

                  <div className="absolute bottom-4 right-4 flex gap-2">
                     <button className="bg-white/90 dark:bg-black/50 p-2 rounded-full shadow hover:bg-white dark:hover:bg-black transition-colors">
                        <span className="material-icons text-slate-700 dark:text-white">share</span>
                     </button>
                     <button className="bg-white/90 dark:bg-black/50 p-2 rounded-full shadow hover:bg-white dark:hover:bg-black transition-colors">
                        <span className="material-icons text-slate-700 dark:text-white">favorite_border</span>
                     </button>
                  </div>
               </div>
            </div>

            <div className="flex-1">
               <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                     {product.free_delivery && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-shop-red bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-sm">
                           <span className="material-icons text-[12px]">local_shipping</span> Free shipping
                        </span>
                     )}
                     {(product.deliveryTimeEstimate || product.deliveryTimeDays) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                           <span className="material-icons text-[12px]">{product.isExpressDelivery ? 'bolt' : 'schedule'}</span>
                           {product.isExpressDelivery ? 'Express: ' : 'Delivery: '}
                           {product.deliveryTimeEstimate || (product.deliveryTimeDays ? `${product.deliveryTimeDays} day${product.deliveryTimeDays === 1 ? '' : 's'}` : '')}
                        </span>
                     )}
                     <span className="flex items-center gap-1 text-[10px] font-bold text-shop-red bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-sm">
                        <span className="material-icons text-[12px]">account_balance_wallet</span> {formatPrice(4, currencyCode)} Credit for delay
                     </span>
                  </div>

                  <h1 className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white mb-2 leading-snug">
                     {product.title}
                  </h1>

                  <div className="flex items-center gap-1 text-xs mb-4">
                     <span className="flex items-center text-slate-900 dark:text-white font-bold">{formattedRating} <span className="material-icons text-sm">star</span></span>
                     <span className="w-px h-3 bg-slate-300 mx-1"></span>
                     <a href="#reviews" className="text-slate-500 hover:underline">{product.reviews?.toLocaleString?.() ?? product.reviews} reviews</a>
                     <span className="w-px h-3 bg-slate-300 mx-1"></span>
                     <span className="text-slate-500">{soldLabel}</span>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 mb-6">
                     <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-orange-600 dark:text-orange-500">{formatPrice(displayPrice, currencyCode)}</span>
                        {displayRRP > displayPrice && (
                           <span className="text-sm text-slate-400 line-through">RRP {formatPrice(displayRRP, currencyCode)}</span>
                        )}
                        {discountPercent !== null && discountPercent > 0 && (
                           <span className="text-xs font-bold text-orange-600 border border-orange-600 px-1 rounded">-{discountPercent}%</span>
                        )}
                     </div>
                     {showPromo && (
                        <div className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                           {promoLine}
                        </div>
                     )}
                  </div>

                  {/* Coupons Section */}
                  {(product.activeCoupon || productCoupons.length > 0) && (
                     <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                           <span className="material-icons text-orange-500 text-sm">local_offer</span>
                           <span className="text-sm font-bold text-slate-900 dark:text-white">Available Coupons</span>
                        </div>
                        <div className="flex flex-col gap-2">
                           {/* Active Coupon from View */}
                           {product.activeCoupon && (
                              <div className="relative overflow-hidden bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-500 border-y border-r border-orange-200 dark:border-orange-800 rounded-r-lg p-3 flex items-center justify-between gap-4 transition-all hover:shadow-md group">
                                 <div className="pl-2">
                                    <div className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                                       {product.activeCoupon.amount ? `$${product.activeCoupon.amount} OFF` : `${product.activeCoupon.percent}% OFF`}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                       Code: {product.activeCoupon.code}
                                    </div>
                                    {product.activeCoupon.endsAt && (
                                       <div className="text-[10px] text-slate-400 mt-0.5">
                                          Expires: {new Date(product.activeCoupon.endsAt).toLocaleDateString()}
                                       </div>
                                    )}
                                 </div>
                                 <button
                                    onClick={() => {
                                       if (product.activeCoupon) {
                                          navigator.clipboard.writeText(product.activeCoupon.code);
                                          alert('Coupon code copied!');
                                       }
                                    }}
                                    className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-bold transition-colors"
                                 >
                                    Copy Code
                                 </button>
                              </div>
                           )}

                           {productCoupons
                              .filter(c => c.code !== product.activeCoupon?.code)
                              .map(coupon => {
                                 const isClaimed = claimedCoupons.has(coupon.id);
                                 return (
                                    <div key={coupon.id} className="relative overflow-hidden bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center justify-between gap-4 transition-all hover:shadow-md group">
                                       <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border border-orange-200 dark:border-orange-800"></div>
                                       <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border border-orange-200 dark:border-orange-800"></div>

                                       <div className="pl-2">
                                          <div className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                                             {coupon.discount_amount ? `$${coupon.discount_amount} OFF` : `${coupon.discount_percentage}% OFF`}
                                          </div>
                                          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                             {coupon.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                             Expires: {new Date(coupon.end_time).toLocaleDateString()}
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => !isClaimed && handleClaimCoupon(coupon.id)}
                                          disabled={isClaimed}
                                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isClaimed
                                             ? 'bg-green-100 text-green-700 cursor-default'
                                             : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-500/30'
                                             }`}
                                       >
                                          {isClaimed ? 'Claimed' : 'Claim'}
                                       </button>
                                    </div>
                                 );
                              })}
                        </div>
                     </div>
                  )}

                  {/* Automatic Promotions (e.g. Buy X Get Y) */}
                  {product.auto_discount_type && (
                     <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                              <span className="material-icons text-indigo-600 dark:text-indigo-400">redeem</span>
                           </div>
                           <div>
                              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                                 {product.auto_discount_name || 'Limited Time Promotion'}
                              </div>
                              <div className="text-sm font-black text-slate-800 dark:text-white">
                                 {product.auto_discount_type === 'buy_x_get_y'
                                    ? `Buy ${product.auto_discount_buy_qty} get ${product.auto_discount_get_qty} free`
                                    : product.auto_discount_type === 'percentage'
                                       ? `${product.auto_discount_value}% discount applied automatically`
                                       : `$${product.auto_discount_value} off applied automatically`
                                 }
                                 {product.auto_discount_min_requirement && product.auto_discount_min_requirement > 0 && (
                                    <span className="text-[10px] font-normal text-slate-500 ml-2">
                                       (Min. order: ${product.auto_discount_min_requirement})
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Quantity Discounts Section */}
                  {quantityDiscounts.length > 0 && (
                     <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                           <span className="material-icons text-emerald-500 text-sm">inventory_2</span>
                           <span className="text-sm font-bold text-slate-900 dark:text-white">Bulk Pricing Discounts</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {quantityDiscounts.sort((a, b) => a.min_quantity - b.min_quantity).map((tier) => (
                              <div key={tier.id} className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center transition-all hover:shadow-md">
                                 <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Buy {tier.min_quantity}+</div>
                                 <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                    {formatPrice(tier.unit_price, currencyCode)}
                                 </div>
                                 <div className="text-[10px] text-slate-500 font-medium">Per item</div>
                                 {displayPrice > tier.unit_price && (
                                    <div className="text-[9px] text-white bg-emerald-500 rounded-full px-1.5 py-0.5 mt-2 inline-block">
                                       Save {Math.round((1 - tier.unit_price / displayPrice) * 100)}%
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">*Discount will be automatically applied in your cart based on quantity.</p>
                     </div>
                  )}

                  {/* Variants Selection */}
                  <div className="space-y-5 mb-6">
                     {colorOptionName && colorCards.length > 0 && (
                        <div>
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                 {colorOptionName}: <span className="font-normal text-slate-600 dark:text-slate-400">{selectedOptions[colorOptionName]}</span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                 Choose a color with its gallery
                              </span>
                           </div>

                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {colorCards.map(({ label, variant }) => {
                                 const isSelected = selectedOptions[colorOptionName] === label;
                                 const previewVariant = findVariantFor({ [colorOptionName]: label }) || variant;
                                 const variantPrice = previewVariant?.price ?? product.price;
                                 const variantStock = previewVariant?.stock;
                                 const previewImage = previewVariant?.image || variant.image;
                                 const previewMedia = previewImage
                                    ? {
                                       id: `hover-${label}`,
                                       image_url: previewImage,
                                       thumbnail_url: previewImage,
                                       type: 'image' as const,
                                       alt_text: `${product.title} - ${label}`
                                    }
                                    : null;

                                 return (
                                    <button
                                       key={label}
                                       onClick={() => setSelectedOptions(prev => ({ ...prev, [colorOptionName]: label }))}
                                       onMouseEnter={() => {
                                          if (previewMedia) {
                                             setHoverPreviewMedia(previewMedia);
                                             setUserHasSelected(true);
                                          }
                                       }}
                                       onMouseLeave={() => setHoverPreviewMedia(null)}
                                       className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all shadow-sm ${isSelected
                                          ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/70 dark:bg-orange-900/10'
                                          : 'border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                          }`}
                                    >
                                       <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                                          {previewVariant?.image || variant.image ? (
                                             <img src={previewVariant?.image || variant.image!} alt={label} className="w-full h-full object-cover" />
                                          ) : (
                                             <div
                                                className="w-full h-full"
                                                style={{
                                                   backgroundColor: ['midnight', 'starlight', 'blue', 'red', 'purple', 'black', 'gold', 'white'].includes(label.toLowerCase()) ? getColorStyle(label) : undefined,
                                                   backgroundImage: !['midnight', 'starlight', 'blue', 'red', 'purple', 'black', 'gold', 'white'].includes(label.toLowerCase()) ? `url(${product.image})` : undefined,
                                                   backgroundSize: 'cover',
                                                   backgroundPosition: 'center'
                                                }}
                                             />
                                          )}
                                       </div>

                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                             <div>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{label}</p>
                                                {typeof variantStock === 'number' && <p className="text-[11px] text-slate-500">{variantStock} in stock</p>}
                                             </div>
                                             <div className="text-right">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(variantPrice, currencyCode)}</p>
                                                {isSelected && <span className="text-[10px] text-orange-600 font-bold flex items-center gap-0.5 justify-end"><span className="material-icons text-[10px]">check</span> Selected</span>}
                                             </div>
                                          </div>
                                       </div>
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     )}

                     {displayedOptions.map((option) => (
                        <div key={option.id}>
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                 {option.name}: <span className="font-normal text-slate-600 dark:text-slate-400">{selectedOptions[option.name]}</span>
                              </span>
                              {['size', 'storage'].some(k => option.name.toLowerCase().includes(k)) && (
                                 <button className="text-xs text-orange-500 hover:underline font-medium flex items-center gap-0.5">
                                    <span className="material-icons text-[14px]">straighten</span> Size Guide
                                 </button>
                              )}
                           </div>

                           <div className="flex flex-wrap gap-2">
                              {option.values.map((val) => {
                                 const variantForValue = findVariantFor({ [option.name]: val });
                                 const variantPrice = variantForValue?.price ?? product.price;
                                 const variantStock = variantForValue?.stock;
                                 const isSelected = selectedOptions[option.name] === val;
                                 const isDisabled = typeof variantStock === 'number' && variantStock <= 0;

                                 return (
                                    <button
                                       key={val}
                                       onClick={() => !isDisabled && setSelectedOptions(prev => ({ ...prev, [option.name]: val }))}
                                       disabled={isDisabled}
                                       className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 min-w-[90px] ${isSelected
                                          ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 shadow-sm'
                                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                       <div className="flex flex-col leading-tight">
                                          <span>{val}</span>
                                          <span className="text-[11px] font-medium text-slate-500">{formatPrice(variantPrice, currencyCode)}</span>
                                          {typeof variantStock === 'number' && <span className="text-[10px] text-slate-400">{variantStock} left</span>}
                                       </div>
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     ))}

                     {isLoadingVariants && (
                        <div className="text-xs text-slate-500">Loading variants...</div>
                     )}
                  </div>

                  <button
                     className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-orange-500/20 transition-all active:scale-[0.99] mb-6"
                     onClick={() => {
                        if (onAddToCart) {
                           // Pass the specific variant if selected
                           const productToAdd = currentVariant
                              ? { ...product, id: currentVariant.id, price: currentVariant.price, title: `${product.title} - ${Object.values(currentVariant.options).join('/')}` }
                              : product;
                           onAddToCart(productToAdd);
                        }
                     }}
                  >
                     Add to Cart
                  </button>
               </div>
            </div>
         </div>

         <div className="mt-12 flex flex-col lg:flex-row gap-12">
            <div id="reviews" className="flex-1">
               <ReviewSection
                  productId={product.id.toString()}
                  userId={user?.id}
                  hasPurchased={false} // TODO: Check if user has purchased this product
               />
            </div>

            <div className="w-full lg:w-96 flex-shrink-0 space-y-8">
               {vendor ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                     <div className="flex items-center gap-3 mb-4">
                        {vendor.logo_url ? (
                           <img
                              src={vendor.logo_url}
                              alt={vendor.business_name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                           />
                        ) : (
                           <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xl uppercase">
                              {vendor.business_name.charAt(0)}
                           </div>
                        )}
                        <div className="flex-1">
                           <div className="flex items-center gap-1">
                              <h3 className="font-bold text-slate-900 dark:text-white">{vendor.business_name}</h3>
                              {vendor.is_verified && (
                                 <span className="material-icons text-blue-500 dark:text-blue-400 text-sm" title="Verified Seller">verified</span>
                              )}
                           </div>
                           <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{vendor.total_products} Items</span>
                              <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
                              <span className="flex items-center">{vendor.vendor_rating} <span className="material-icons text-[10px] ml-0.5">star</span></span>
                              <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
                              <span>{vendor.review_count} Reviews</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-2 mb-4">
                        <button
                           className="flex-1 px-4 py-2 rounded-full text-xs font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-1"
                           onClick={handleMessageClick}
                        >
                           <span className="material-icons text-sm">chat</span>
                           Message
                        </button>
                        <button
                           className={`flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all ${isFollowing
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                              : 'border-2 border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                              } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                           onClick={handleFollowToggle}
                           disabled={isFollowLoading}
                        >
                           <div className="flex items-center justify-center gap-1">
                              <span className="material-icons text-sm">
                                 {isFollowing ? 'check' : 'add'}
                              </span>
                              {isFollowing ? 'Following' : 'Follow'}
                           </div>
                        </button>
                        <button
                           className="group relative px-4 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-white overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500/50"
                           onClick={() => onVisitStore && vendor?.vendor_id && onVisitStore(vendor.vendor_id)}
                        >
                           <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                           <span className="relative flex items-center gap-1">
                              <span className="material-icons text-sm text-slate-400 group-hover:text-orange-500 transition-colors">storefront</span>
                           </span>
                        </button>
                     </div>

                     {/* Follower Count */}
                     {
                        followerCount > 0 && (
                           <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                              <span className="font-medium">{followerCount.toLocaleString()}</span> {followerCount === 1 ? 'follower' : 'followers'}
                           </div>
                        )
                     }

                     {/* Badges */}
                     {
                        vendor?.badges && vendor.badges.length > 0 && (
                           <div className="flex flex-wrap gap-2 mb-4">
                              {vendor.badges.map((badge, idx) => {
                                 const getBadgeStyle = (category: string) => {
                                    switch (category) {
                                       case 'trust': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
                                       case 'community': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
                                       case 'growth': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
                                       default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
                                    }
                                 };
                                 const getBadgeIcon = (name: string) => {
                                    switch (name) {
                                       case 'verified_seller': return 'verified';
                                       case 'platform_pioneer': return 'rocket_launch';
                                       case 'rising_star': return 'trending_up';
                                       default: return 'military_tech';
                                    }
                                 };
                                 return (
                                    <span key={idx} className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 ${getBadgeStyle(badge.badge_category)}`} title={badge.description}>
                                       <span className="material-icons !text-[12px]">{getBadgeIcon(badge.badge_name)}</span>
                                       {badge.badge_name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </span>
                                 );
                              })}
                           </div>
                        )
                     }

                     {/* Stats Grid */}
                     <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                           <span className="material-icons text-green-600 dark:text-green-400 text-[16px]">local_shipping</span>
                           <span className="font-medium">{vendor?.delivery_speed}</span>
                        </div>
                        {vendor?.response_time && (
                           <div className="flex items-center gap-2">
                              <span className="material-icons text-slate-400 text-[16px]">chat</span>
                              <span>{vendor.response_time}</span>
                           </div>
                        )}
                        {vendor?.seller_since && (
                           <div className="flex items-center gap-2">
                              <span className="material-icons text-slate-400 text-[16px]">calendar_today</span>
                              <span>{vendor.seller_since}</span>
                           </div>
                        )}
                     </div>
                  </div >
               ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex items-center gap-3">
                     <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                     <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
                     </div>
                  </div>
               )}
            </div >
         </div >

         {/* New Product Details & Tags Section */}
         <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-8">
               {/* Description */}
               {(product.description) && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">About this product</h2>
                     <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                        <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
                     </div>
                  </div>
               )}

               {/* Tags & Discovery */}
               {(product.tags?.length || product.use_case_tags?.length || product.occasion_tags?.length) && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-icons text-purple-500">auto_awesome</span>
                        Discovery
                     </h3>

                     <div className="space-y-4">
                        {/* Occasions */}
                        {product.occasion_tags && product.occasion_tags.length > 0 && (
                           <div>
                              <span className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wide">Perfect For</span>
                              <div className="flex flex-wrap gap-2">
                                 {product.occasion_tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white dark:bg-slate-700 border border-purple-100 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full shadow-sm">
                                       {tag}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Use Cases */}
                        {product.use_case_tags && product.use_case_tags.length > 0 && (
                           <div>
                              <span className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wide">Best Used In</span>
                              <div className="flex flex-wrap gap-2">
                                 {product.use_case_tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white dark:bg-slate-700 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full shadow-sm">
                                       {tag}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* General Tags */}
                        {product.tags && product.tags.length > 0 && (
                           <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              {product.tags.map(tag => (
                                 <span key={tag} className="text-xs text-slate-500 hover:text-orange-500 cursor-pointer transition-colors bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-600">
                                    #{tag}
                                 </span>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>

            {/* Enhanced Delivery & Returns Box */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm sticky top-24">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                     <span className="material-icons text-orange-500">local_shipping</span>
                     Delivery & Returns
                  </h3>

                  <div className="space-y-6">
                     {/* Scope */}
                     <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                           <span className="material-icons text-orange-500">public</span>
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {product.deliveryScope === 'nationwide' ? 'Nationwide Delivery' :
                                 product.deliveryScope === 'regional' ? 'Regional Delivery' : 'Local Delivery Only'}
                           </div>
                           <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {product.delivery_locations && product.delivery_locations.length > 0
                                 ? `Available in: ${product.delivery_locations.join(', ')}`
                                 : 'This item ships to most locations. Check with seller for specifics.'}
                           </div>
                        </div>
                     </div>

                     {/* Cost */}
                     <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                           <span className="material-icons text-green-600">payments</span>
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {product.free_delivery ? 'Free Delivery' : `Shipping: ${formatPrice(product.delivery_cost || 0, currencyCode)}`}
                           </div>
                           {product.min_order_for_free_delivery && product.min_order_for_free_delivery > 0 ? (
                              <div className="text-xs text-green-600 mt-1 font-bold">
                                 Spend {formatPrice(product.min_order_for_free_delivery, currencyCode)} for Free Shipping
                              </div>
                           ) : product.min_order_value && product.min_order_value > 0 ? (
                              <div className="text-xs text-slate-500 mt-1">
                                 Min. Order: {formatPrice(product.min_order_value, currencyCode)}
                              </div>
                           ) : null}
                        </div>
                     </div>

                     {/* Speed */}
                     <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                           <span className="material-icons text-blue-500">{product.isExpressDelivery ? 'bolt' : 'schedule'}</span>
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {product.isExpressDelivery ? 'Express Delivery' : 'Standard Shipping'}
                           </div>
                           <div className="text-xs text-slate-500 mt-1">
                              Estimated arrival: <span className="font-bold text-slate-700 dark:text-slate-300">{product.deliveryTimeEstimate || (product.deliveryTimeDays ? `${product.deliveryTimeDays} Business Days` : '3-5 Days')}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                     <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="material-icons text-slate-400 text-sm">verified_user</span>
                        <span>JuaExpress Buyer Protection</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* AI Search Results: Same Items */}
         {
            sameItems.length > 0 && (
               <div className="mt-16">
                  <div className="flex items-center mb-6">
                     <span className="material-icons text-shop-red text-2xl mr-2">image_search</span>
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white">Exact matches for you</h2>
                     <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Looks just like yours</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                     {sameItems.map(p => (
                        <ProductCard
                           key={p.id}
                           product={p}
                           onProductClick={onRelatedProductClick || onProductClick}
                           onAddToCart={onAddToCart}
                        />
                     ))}
                  </div>
               </div>
            )
         }

         {/* AI Search Results: Similar Items */}
         {
            similarItems.length > 0 && (
               <div className="mt-12">
                  <div className="flex items-center mb-6">
                     <span className="material-icons text-blue-500 text-2xl mr-2">recommend</span>
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white">More to discover</h2>
                     <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">Picked for your style</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                     {similarItems.map(p => (
                        <ProductCard
                           key={p.id}
                           product={p}
                           onProductClick={onRelatedProductClick || onProductClick}
                           onAddToCart={onAddToCart}
                        />
                     ))}
                  </div>
               </div>
            )
         }

         {/* Loading State */}
         {
            isLoadingRelated && (
               <div className="mt-16 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary mb-4"></div>
                  <p className="text-slate-500 text-sm">Finding similar items...</p>
               </div>
            )
         }

         {/* Message Modal */}
         {
            isMessageModalOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                     <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Message Seller</h3>
                        <button
                           onClick={() => setIsMessageModalOpen(false)}
                           className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                        >
                           <span className="material-icons">close</span>
                        </button>
                     </div>

                     <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                           <img src={product.image} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                           <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{product.title}</p>
                              <p className="text-xs text-gray-500">{vendor?.shop_name || 'Seller'}</p>
                           </div>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Message</label>
                           <textarea
                              value={initialMessage}
                              onChange={(e) => setInitialMessage(e.target.value)}
                              className="w-full h-32 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-orange-500 resize-none"
                              placeholder="Write your message here..."
                              autoFocus
                           />
                        </div>
                     </div>

                     <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                        <button
                           onClick={() => setIsMessageModalOpen(false)}
                           className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleConfirmSendMessage}
                           disabled={!initialMessage.trim()}
                           className="px-6 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                           <span>Send Message</span>
                           <span className="material-icons text-sm">send</span>
                        </button>
                     </div>
                  </div>
               </div>
            )
         }
      </div >
   );
};

export default ProductDetailView;
