
import React, { useState, useEffect, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product, GalleryMediaItem, User, Breadcrumb, VisualCategory, ProductOption, ProductVariant, PromoCoupon, QuantityDiscountTier } from '../types';
import ProductCard from './ProductCard';
import { fetchRelatedProducts, RelatedProduct, fetchCategoryName, toggleFollowStore, getFollowStatus, fetchProductVariants, getProductCoupons, claimCoupon, fetchVendorInfo, fetchQuantityDiscounts, isInWishlist, toggleWishlist } from '../lib/api';
import { trackProductViewAuto } from '../lib/tracking';
import { ReviewSection } from './ReviewSection';
import { playFollowSound, playUnfollowSound, playWishlistAddSound, playWishlistRemoveSound } from '../lib/sounds';
import { useSEO } from '../lib/useSEO';
import { generateProductSchema, generateBreadcrumbSchema, getProductPageSEO, SITE_CONFIG } from '../lib/seo-utils';
import { formatPrice, getCurrencySymbol } from '../lib/currency';
import ImageMagnifier from './ImageMagnifier';
import ProductQuestions from './ProductDetails/ProductQuestions';

function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}

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
   const [useCaseItems, setUseCaseItems] = useState<Product[]>([]);

   // Wishlist State
   const [isWishlisted, setIsWishlisted] = useState(false);
   const [isWishlistLoading, setIsWishlistLoading] = useState(false);

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

   // Variant Overlay State
   const [isVariantOverlayOpen, setIsVariantOverlayOpen] = useState(false);
   const [overlayVariant, setOverlayVariant] = useState<ProductVariant | null>(null);
   const [overlayQuantity, setOverlayQuantity] = useState(1);
   const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
   const [isImageFocusView, setIsImageFocusView] = useState(false);

   // Tab navigation state - default to Reviews if has reviews, else Description
   const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>(
      product.reviews && product.reviews > 0 ? 'reviews' : 'description'
   );

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

   const openVariantOverlay = (variant: ProductVariant | null, overrides?: Record<string, string>, focusImage: boolean = false) => {
      if (overrides && Object.keys(overrides).length > 0) {
         setSelectedOptions(prev => ({ ...prev, ...overrides }));
      }
      setOverlayVariant(variant || findVariantFor(overrides || {}) || currentVariant);
      setOverlayQuantity(1);
      setIsVariantOverlayOpen(true);
      if (focusImage) {
         setIsImageFocusView(true);
      } else {
         setIsImageFocusView(false);
      }
   };

   const closeVariantOverlay = () => setIsVariantOverlayOpen(false);

   const adjustOverlayQuantity = (delta: number) => {
      const maxQty = overlayVariant?.stock ?? product.stock ?? 999;
      setOverlayQuantity(prev => {
         const next = Math.max(1, prev + delta);
         return Math.min(next, maxQty > 0 ? maxQty : next);
      });
   };

   const handleOverlayAddToCart = () => {
      if (!onAddToCart) return;

      const itemsToAdd: Product[] = [];

      // Check if we use multiple quantity selection
      if (Object.keys(variantQuantities).length > 0) {
         Object.entries(variantQuantities).forEach(([val, qty]: [string, any]) => {
            if (qty > 0) {
               // Find the variant for this value
               const variant = productVariants.find(v => v.options && Object.values(v.options).includes(val));
               if (variant) {
                  itemsToAdd.push({
                     ...product,
                     // Keep product.id, store variant.id separately
                     variant_id: variant.id,
                     price: variant.price,
                     title: `${product.title} - ${Object.values(variant.options || {}).join('/')}`,
                     quantity: qty
                  } as any);
               }
            }
         });
      } else {
         const variant = overlayVariant || currentVariant;
         const productToAdd = variant
            ? { ...product, variant_id: variant.id, price: variant.price, title: `${product.title} - ${Object.values(variant.options || {}).join('/')}` }
            : product;
         itemsToAdd.push({ ...productToAdd, quantity: overlayQuantity } as any);
      }

      itemsToAdd.forEach(item => onAddToCart(item));
      setIsVariantOverlayOpen(false);
      setVariantQuantities({});
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

            // Fetch Use Case Recommendations
            if (product.use_case_tags && product.use_case_tags.length > 0) {
               const tag = product.use_case_tags[0];
               try {
                  const { fetchFilteredProducts } = await import('../lib/api');
                  // Pass empty filters as the second argument
                  const results = await fetchFilteredProducts(tag, {
                     category_ids: [],
                     brand_ids: [],
                     price_min: null,
                     price_max: null
                  });
                  // Slice to limit results as fetchFilteredProducts doesn't support limit param directly
                  setUseCaseItems(results.filter(p => p.id.toString() !== product.id?.toString()).slice(0, 6));
               } catch (e) {
                  console.error("Failed to load use case items", e);
               }
            }
         }
      };
      loadRelated();
   }, [product.id, product.use_case_tags]);

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

   // Check if product is in wishlist
   useEffect(() => {
      const checkWishlistStatus = async () => {
         if (product.id && user?.id) {
            const inWishlist = await isInWishlist(user.id, product.id.toString());
            setIsWishlisted(inWishlist);
         } else {
            setIsWishlisted(false);
         }
      };
      checkWishlistStatus();
   }, [product.id, user?.id]);

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

   const handleMessageClick = () => {
      if (!user) {
         // If not logged in, trigger default action which usually prompts login
         if (onMessageSeller) onMessageSeller(product);
         return;
      }
      setIsMessageModalOpen(true);
      if (product.listing_type === 'reservation') {
         setInitialMessage(`Hi, I'd like to reserve ${product.title}. Could you let me know the process?`);
      } else if (product.listing_type === 'inquiry') {
         setInitialMessage(`Hi, I have an inquiry about ${product.title}. Could you provide more details?`);
      } else {
         setInitialMessage(`Hi, I'm interested in your ${product.title}...`);
      }
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
                     <button
                        onClick={handleWishlistToggle}
                        disabled={isWishlistLoading}
                        className={`p-2 rounded-full shadow transition-all ${isWishlisted
                           ? 'bg-red-500 hover:bg-red-600'
                           : 'bg-white/90 dark:bg-black/50 hover:bg-white dark:hover:bg-black'}`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                     >
                        <span className={`material-icons ${isWishlisted ? 'text-white' : 'text-slate-700 dark:text-white'} ${isWishlistLoading ? 'animate-pulse' : ''}`}>
                           {isWishlisted ? 'favorite' : 'favorite_border'}
                        </span>
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
                     <div className="flex items-center gap-1">
                        <span className="material-icons !text-[14px] text-slate-900 dark:text-slate-100">star</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formattedRating}</span>
                     </div>
                     <span className="w-px h-3 bg-slate-300 mx-1"></span>
                     <a href="#reviews" className="text-slate-500 hover:underline">({product.reviews?.toLocaleString?.() ?? product.reviews})</a>
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
                                       if (productVariants.length > 1) {
                                          openVariantOverlay(currentVariant);
                                          return;
                                       }
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
                                       onClick={() => openVariantOverlay(previewVariant || variant, { [colorOptionName]: label }, true)}
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
                     className={cn(
                        "w-full text-white font-bold text-lg py-4 rounded-full shadow-lg transition-all active:scale-[0.99] mb-6 flex items-center justify-center gap-2",
                        product.listing_type === 'inquiry'
                           ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                           : product.listing_type === 'reservation'
                              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                              : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                     )}
                     onClick={() => {
                        if (product.listing_type === 'inquiry' || product.listing_type === 'reservation') {
                           handleMessageClick();
                           return;
                        }

                        if (productVariants.length > 1) {
                           openVariantOverlay(currentVariant);
                           return;
                        }
                        if (onAddToCart) {
                           // Pass both product and variant IDs to ensure correct syncing and checkout
                           const productToAdd = currentVariant
                              ? { ...product, variant_id: currentVariant.id, price: currentVariant.price, title: `${product.title} - ${Object.values(currentVariant.options).join('/')}` }
                              : product;
                           onAddToCart(productToAdd);
                        }
                     }}
                  >
                     <span className="material-icons">
                        {product.listing_type === 'inquiry' ? 'chat' : product.listing_type === 'reservation' ? 'event_available' : 'shopping_cart'}
                     </span>
                     {product.listing_type === 'inquiry' ? 'Send Inquiry' : product.listing_type === 'reservation' ? 'Reserve Now' : 'Add to Cart'}
                  </button>
               </div>
            </div>
         </div>

         {/* Modern Tabbed Content Section - Below the product hero */}
         <div className="mt-16 mb-12">
            {/* Tab Navigation */}
            <div className="flex border-b-2 border-slate-200 dark:border-slate-700 mb-8">
               {/* Dynamic tab order: Reviews first if has reviews, else last */}
               {(product.reviews && product.reviews > 0
                  ? ['Reviews', 'Description', 'Specifications']
                  : ['Description', 'Specifications', 'Reviews']
               ).map((tab) => (
                  <button
                     key={tab}
                     onClick={() => setActiveTab(tab.toLowerCase())}
                     className={`px-6 py-4 text-sm font-bold transition-all relative ${activeTab === tab.toLowerCase()
                        ? 'text-primary'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                  >
                     {tab}
                     {tab === 'Reviews' && product.reviews && product.reviews > 0 && (
                        <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                           {product.reviews}
                        </span>
                     )}
                     {activeTab === tab.toLowerCase() && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-orange-500"></div>
                     )}
                  </button>
               ))}
            </div>

            {/* Description Tab Content */}
            {activeTab === 'description' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-8">
                     {/* Enhanced Description */}
                     {product.description && (
                        <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                           <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center">
                                 <span className="material-icons-round text-primary">description</span>
                              </div>
                              <h2 className="text-xl font-black text-slate-900 dark:text-white">About this product</h2>
                           </div>
                           <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                              <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
                           </div>
                        </div>
                     )}

                     {/* Tags & Discovery */}
                     {(product.tags?.length || product.use_case_tags?.length || product.occasion_tags?.length) && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50 rounded-3xl p-8 border border-purple-100 dark:border-slate-700">
                           <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                 <span className="material-icons-round text-white">auto_awesome</span>
                              </div>
                              <h3 className="text-lg font-black text-slate-900 dark:text-white">Discovery</h3>
                           </div>

                           <div className="space-y-5">
                              {product.occasion_tags && product.occasion_tags.length > 0 && (
                                 <div>
                                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 block">Perfect For</span>
                                    <div className="flex flex-wrap gap-2">
                                       {product.occasion_tags.map(tag => (
                                          <span key={tag} className="px-4 py-2 bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 text-sm font-bold rounded-full shadow-sm border border-purple-100 dark:border-purple-800">
                                             {tag}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              {product.use_case_tags && product.use_case_tags.length > 0 && (
                                 <div>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 block">Best Used In</span>
                                    <div className="flex flex-wrap gap-2">
                                       {product.use_case_tags.map(tag => (
                                          <a href={`/search?q=${tag}`} key={tag} className="px-4 py-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-full shadow-sm border border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                             {tag}
                                          </a>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              {product.tags && product.tags.length > 0 && (
                                 <div className="pt-4 border-t border-purple-200/50 dark:border-slate-700">
                                    <div className="flex flex-wrap gap-2">
                                       {product.tags.map(tag => (
                                          <span key={tag} className="text-sm text-slate-500 hover:text-primary cursor-pointer transition-colors">
                                             #{tag}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Sidebar - Vendor Info */}
                  <div className="space-y-6">
                     {vendor ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm sticky top-24">
                           <div className="flex items-center gap-4 mb-6">
                              {vendor.logo_url ? (
                                 <img src={vendor.logo_url} alt={vendor.business_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-700" />
                              ) : (
                                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-xl uppercase">
                                    {vendor.business_name.charAt(0)}
                                 </div>
                              )}
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <h3 className="font-black text-slate-900 dark:text-white">{vendor.business_name}</h3>
                                    {vendor.is_verified && <span className="material-icons-round text-blue-500 text-sm">verified</span>}
                                 </div>
                                 <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span>{vendor.total_products} Items</span>
                                    <span>•</span>
                                    <span className="flex items-center">{vendor.vendor_rating} <span className="material-icons-round text-amber-500 text-xs ml-0.5">star</span></span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-2 mb-4">
                              <button onClick={handleMessageClick} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
                                 <span className="material-icons-round text-sm">chat</span> Message
                              </button>
                              <button onClick={() => onVisitStore && vendor?.vendor_id && onVisitStore(vendor.vendor_id)} className="px-4 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-primary to-orange-500 text-white hover:shadow-lg hover:shadow-primary/30 transition-all">
                                 <span className="material-icons-round text-sm">storefront</span>
                              </button>
                              {/* Follow Button */}
                              <button
                                 onClick={handleFollowToggle}
                                 disabled={isFollowLoading}
                                 className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isFollowing
                                       ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                                       : 'border-2 border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                    } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                 <span className="material-icons-round text-sm">{isFollowing ? 'check' : 'add'}</span>
                                 {isFollowing ? 'Following' : 'Follow'}
                              </button>
                           </div>
                           {/* Follower Count */}
                           {followerCount > 0 && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                 <span className="font-medium">{followerCount.toLocaleString()}</span> {followerCount === 1 ? 'follower' : 'followers'}
                              </div>
                           )}
                        </div>
                     ) : null}
                  </div>
               </div>
            )}

            {/* Specifications Tab Content */}
            {activeTab === 'specifications' && (
               <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                           <span className="material-icons-round text-white">list_alt</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Product Specifications</h2>
                     </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {/* Basic Info */}
                     <div className="grid grid-cols-2 text-sm">
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Category</div>
                        <div className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.category || 'N/A'}</div>
                     </div>
                     {product.brand && (
                        <div className="grid grid-cols-2 text-sm">
                           <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Brand</div>
                           <div className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.brand}</div>
                        </div>
                     )}
                     {product.sku && (
                        <div className="grid grid-cols-2 text-sm">
                           <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">SKU</div>
                           <div className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{product.sku}</div>
                        </div>
                     )}
                     {productVariants.length > 0 && (
                        <>
                           {Object.entries(productVariants[0]?.options || {}).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-2 text-sm">
                                 <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 capitalize">{key}</div>
                                 <div className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                    {productVariants.map(v => v.options[key]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                                 </div>
                              </div>
                           ))}
                        </>
                     )}
                     {product.weight && (
                        <div className="grid grid-cols-2 text-sm">
                           <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Weight</div>
                           <div className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.weight}</div>
                        </div>
                     )}
                     {product.dimensions && (
                        <div className="grid grid-cols-2 text-sm">
                           <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Dimensions</div>
                           <div className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.dimensions}</div>
                        </div>
                     )}
                     <div className="grid grid-cols-2 text-sm">
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Availability</div>
                        <div className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${product.stock > 10 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              product.stock > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
                           </span>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 text-sm">
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Delivery</div>
                        <div className="px-6 py-4 text-slate-600 dark:text-slate-400">
                           {product.free_delivery ? 'Free Shipping' : `${formatPrice(product.delivery_cost || 0, currencyCode)}`}
                           {product.deliveryTimeEstimate && ` • ${product.deliveryTimeEstimate}`}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 text-sm">
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">Return Policy</div>
                        <div className="px-6 py-4 text-slate-600 dark:text-slate-400">{product.return_policy || '30-day returns'}</div>
                     </div>
                  </div>
               </div>
            )}

            {/* Reviews Tab Content */}
            {activeTab === 'reviews' && (
               <div id="reviews">
                  <ReviewSection
                     productId={product.id.toString()}
                     userId={user?.id}
                     hasPurchased={false}
                  />
               </div>
            )}
         </div>

         {/* Product Questions */}
         <ProductQuestions product={product} />

         {/* AI Search Results: Use Case Recommendations */}
         {
            product.use_case_tags && product.use_case_tags.length > 0 && useCaseItems.length > 0 && (
               <div className="mt-16">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex flex-col">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                           More for {product.use_case_tags[0]}
                           <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                              AI Curated
                           </span>
                        </h2>
                     </div>
                     <a href={`/search?q=${product.use_case_tags[0]}`} className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1">
                        See all
                        <span className="material-icons text-sm">arrow_forward</span>
                     </a>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                     {useCaseItems.map(item => (
                        <ProductCard
                           key={item.id}
                           product={item}
                           onProductClick={onProductClick}
                           onAddToCart={onAddToCart}
                        />
                     ))}
                  </div>
               </div>
            )
         }

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

         {/* Modern Variant Quick Add Overlay - Alibaba Style Drawer */}
         {
            isVariantOverlayOpen && (
               <div className={`fixed inset-0 z-[120] flex justify-end transition-opacity duration-300 ${isVariantOverlayOpen ? 'opacity-100' : 'opacity-0'}`}>
                  <div
                     className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
                     onClick={closeVariantOverlay}
                  />

                  {/* Large Image Preview (Image 2 style) */}
                  {isImageFocusView && (
                     <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12 pointer-events-none z-[121]">
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300 pointer-events-auto w-full max-w-xl relative group">
                           {/* Close/Collapse Button */}
                           <button
                              onClick={() => setIsImageFocusView(false)}
                              className="absolute top-4 right-4 z-10 bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 p-2 rounded-full transition-all text-slate-500"
                           >
                              <span className="material-icons text-sm">close</span>
                           </button>

                           {/* Navigation Arrows */}
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveMediaIndex(prev => (prev - 1 + variantShowcaseMedia.length) % variantShowcaseMedia.length);
                              }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md text-slate-600 dark:text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
                           >
                              <span className="material-icons">chevron_left</span>
                           </button>
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveMediaIndex(prev => (prev + 1) % variantShowcaseMedia.length);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 shadow-md text-slate-600 dark:text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
                           >
                              <span className="material-icons">chevron_right</span>
                           </button>

                           <div className="aspect-square w-full relative overflow-hidden rounded-2xl bg-white flex items-center justify-center">
                              {effectiveActiveMedia.type === 'youtube' ? (
                                 <iframe
                                    src={`${effectiveActiveMedia.video_url}?mute=1&autoplay=1`}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="autoplay; encrypted-media"
                                 />
                              ) : effectiveActiveMedia.type === 'video' ? (
                                 <video src={effectiveActiveMedia.video_url} autoPlay muted playsInline loop className="w-full h-full object-contain" />
                              ) : (
                                 <img
                                    src={effectiveActiveMedia.image_url || product.image}
                                    alt={product.title}
                                    className="w-full h-full object-contain max-h-full"
                                 />
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="relative w-full max-w-md md:max-w-lg bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200 dark:border-slate-800">
                     {/* Header */}
                     <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select variations and quantity</h3>
                        <button
                           onClick={closeVariantOverlay}
                           className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                           <span className="material-icons">close</span>
                        </button>
                     </div>

                     {/* Body - Scrollable Content */}
                     <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
                        {/* Wholesale Price Tiers (Image 1 style) */}
                        {quantityDiscounts.length > 0 && (
                           <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                 <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">25% off</span>
                                 <span className="text-[10px] font-bold text-red-600">Lower priced than similar</span>
                              </div>
                              <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
                                 <div className="flex-shrink-0">
                                    <div className="text-[10px] text-slate-500 mb-1">2 - 99 pieces</div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(product.price, currencyCode)}</div>
                                    <div className="text-[10px] text-slate-400 line-through">{formatPrice(displayRRP || product.price * 1.25, currencyCode)}</div>
                                 </div>
                                 {quantityDiscounts.map((tier, idx) => (
                                    <div key={idx} className="flex-shrink-0 opacity-80">
                                       <div className="text-[10px] text-slate-500 mb-1">{tier.min_quantity}+ pieces</div>
                                       <div className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(tier.unit_price, currencyCode)}</div>
                                       <div className="text-[10px] text-slate-400 line-through">{formatPrice(tier.unit_price * 1.3, currencyCode)}</div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Options with Quantity Selectors (Alibaba style) */}
                        {productOptions.map((option, optIdx) => (
                           <div key={option.id} className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {option.name}: <span className="font-normal text-slate-500">{selectedOptions[option.name]}</span>
                                 </h4>
                              </div>

                              {/* Show higher-level options (e.g. Model Number) as chips */}
                              {optIdx < productOptions.length - 1 ? (
                                 <div className="flex flex-wrap gap-2">
                                    {option.values.map(val => (
                                       <button
                                          key={val}
                                          onClick={() => {
                                             setSelectedOptions(prev => ({ ...prev, [option.name]: val }));
                                             const v = productVariants.find(v => v.options && v.options[option.name] === val);
                                             if (v) {
                                                setOverlayVariant(v);
                                                setActiveMediaIndex(0);
                                             }
                                          }}
                                          className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${selectedOptions[option.name] === val
                                             ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10'
                                             : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                             }`}
                                       >
                                          {val}
                                       </button>
                                    ))}
                                 </div>
                              ) : (
                                 /* Show the last option (usually Color) as a list with quantity selectors */
                                 <div className="space-y-3">
                                    {option.values.map(val => {
                                       const variant = productVariants.find(v => v.options && v.options[option.name] === val);
                                       const qty = variantQuantities[val] || 0;
                                       const updateQty = (delta: number) => {
                                          setVariantQuantities(prev => ({
                                             ...prev,
                                             [val]: Math.max(0, (Number(prev[val]) || 0) + delta)
                                          }));
                                       };

                                       const isSelected = overlayVariant?.id === variant?.id;

                                       return (
                                          <div
                                             key={val}
                                             onClick={() => {
                                                if (variant) {
                                                   setOverlayVariant(variant);
                                                   setActiveMediaIndex(0);
                                                }
                                                setSelectedOptions(prev => ({ ...prev, [option.name]: val }));
                                             }}
                                             className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-orange-200'}`}
                                          >
                                             <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                   <img src={variant?.image || product.image} className="w-full h-full object-cover" alt={val} />
                                                </div>
                                                <div>
                                                   <p className="text-sm font-bold text-slate-800 dark:text-white">{val}</p>
                                                   <p className="text-xs text-slate-500">{formatPrice(variant?.price || product.price, currencyCode)}</p>
                                                </div>
                                             </div>

                                             <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                <button
                                                   onClick={() => updateQty(-1)}
                                                   disabled={qty === 0}
                                                   className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${qty > 0 ? 'border-slate-300 text-slate-800 active:bg-slate-100' : 'border-slate-100 text-slate-300'}`}
                                                >
                                                   <span className="material-icons text-sm">remove</span>
                                                </button>
                                                <span className="text-sm font-bold min-w-[20px] text-center dark:text-white">{qty}</span>
                                                <button
                                                   onClick={() => updateQty(1)}
                                                   className="h-8 w-8 rounded-full border border-slate-300 text-slate-800 dark:text-white active:bg-slate-100 flex items-center justify-center shadow-sm"
                                                >
                                                   <span className="material-icons text-sm">add</span>
                                                </button>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>

                     {/* Footer - Order/Add to Cart */}
                     <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                           <span className="text-sm font-bold text-slate-500">Subtotal</span>
                           <div className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                 <span className="text-xs text-slate-400 font-medium">
                                    {Object.values(variantQuantities).reduce((a: number, b: any) => a + Number(b), 0)} pieces
                                 </span>
                                 <span className="text-xl font-bold text-slate-900 dark:text-white">
                                    {formatPrice(
                                       Object.entries(variantQuantities).reduce((total: number, [val, qty]: [string, any]) => {
                                          const variant = productVariants.find(v => v.options && Object.values(v.options).includes(val));
                                          const price = variant?.price || product.price || 0;
                                          return total + (Number(qty) * price);
                                       }, 0) || (overlayQuantity * (overlayVariant?.price || displayPrice)),
                                       currencyCode
                                    )}
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-3">
                           <button
                              onClick={handleOverlayAddToCart}
                              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all"
                           >
                              Add to cart
                           </button>
                           {/* Hidden buy now for now to keep it clean */}
                        </div>
                     </div>
                  </div>
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
