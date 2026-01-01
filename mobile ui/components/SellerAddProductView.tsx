import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    fetchVerticals,
    fetchCategories,
    fetchBrands,
    fetchAttributes,
    fetchAttributeOptions,
    createProductFull
} from '../../lib/api';
import { MediaService } from '../../lib/media';
import { aiService } from '../../lib/ai-service';
import { SUPPORTED_CURRENCIES, getCurrencySymbol, autoDetectCurrency, useCurrencyConverter } from '../../lib/currency';
import {
    ShopifyVertical,
    ShopifyCategory,
    ShopifyBrand,
    ShopifyAttribute,
    MediaUploadData,
    ProductAttributeData,
    ProductVariantData,
    QuantityDiscountTier,
    ProductCondition
} from '@/types';
import { SearchableSelect } from './SearchableSelect';

interface SellerAddProductViewProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STEPS = ['Basics', 'Attributes', 'Pricing & Variants', 'Pricing & Delivery', 'Media', 'SEO'];

const FieldHelp: React.FC<{ text: string; align?: 'left' | 'right' }> = ({ text, align = 'right' }) => {
    const [isPinned, setIsPinned] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const isOpen = isPinned || isHovering;

    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; placement: 'below' | 'above' }>(
        { top: 0, left: 0, arrowLeft: 16, placement: 'below' }
    );

    const close = () => {
        setIsPinned(false);
        setIsHovering(false);
    };

    const computePosition = () => {
        const btn = buttonRef.current;
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const margin = 8;
        const idealWidth = 256; // tailwind w-64
        const maxWidth = Math.max(180, Math.min(idealWidth, window.innerWidth - margin * 2));

        let left = align === 'right' ? rect.right - maxWidth : rect.left;
        left = Math.max(margin, Math.min(left, window.innerWidth - maxWidth - margin));

        // First pass: assume below
        let top = rect.bottom + 8;
        let placement: 'below' | 'above' = 'below';

        const tip = tooltipRef.current;
        const tipHeight = tip?.offsetHeight ?? 0;
        if (tipHeight > 0) {
            const belowBottom = top + tipHeight + margin;
            if (belowBottom > window.innerHeight) {
                const aboveTop = rect.top - 8 - tipHeight;
                if (aboveTop >= margin) {
                    top = aboveTop;
                    placement = 'above';
                }
            }
        }

        const centerX = rect.left + rect.width / 2;
        let arrowLeft = centerX - left;
        arrowLeft = Math.max(12, Math.min(arrowLeft, maxWidth - 12));

        setPos({ top, left, arrowLeft, placement });
    };

    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(computePosition);

        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (buttonRef.current?.contains(t)) return;
            if (tooltipRef.current?.contains(t)) return;
            close();
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        const onReflow = () => computePosition();

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onReflow);
        // capture scroll from any scroll container
        window.addEventListener('scroll', onReflow, true);

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onReflow);
            window.removeEventListener('scroll', onReflow, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, text, align]);

    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(computePosition);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const tooltipNode = isOpen
        ? createPortal(
            <div
                ref={tooltipRef}
                className="fixed z-[9999] rounded-xl border border-gray-200 bg-white shadow-lg p-3 text-[11px] leading-relaxed text-gray-700"
                style={{
                    top: pos.top,
                    left: pos.left,
                    width: Math.max(180, Math.min(256, window.innerWidth - 16))
                }}
                role="tooltip"
            >
                {text}
                <div
                    className={cn(
                        "absolute h-2 w-2 rotate-45 bg-white border-gray-200",
                        pos.placement === 'below'
                            ? "-top-1 border-l border-t"
                            : "-bottom-1 border-r border-b"
                    )}
                    style={{ left: pos.arrowLeft - 4 }}
                />
            </div>,
            document.body
        )
        : null;

    return (
        <span className="inline-flex items-center">
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPinned(v => !v);
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 active:scale-95 transition"
                aria-label="Help"
                aria-expanded={isOpen}
            >
                <span className="material-icons text-[16px]">info_outline</span>
            </button>
            {tooltipNode}
        </span>
    );
};

const DELIVERY_SCOPE_OPTIONS = [
    { value: 'nationwide', label: 'Nationwide', detail: 'Across the whole country' },
    { value: 'regional', label: 'Regional', detail: 'Selected regions or states' },
    { value: 'local', label: 'Local', detail: 'Within one city or radius' }
];

// Predefined regions for the regional delivery option
const PREDEFINED_REGIONS = [
    // Global Continents
    { id: 'africa', name: 'Africa', icon: '🌍', group: 'Continents' },
    { id: 'europe', name: 'Europe', icon: '🇪🇺', group: 'Continents' },
    { id: 'asia', name: 'Asia', icon: '🌏', group: 'Continents' },
    { id: 'north_america', name: 'North America', icon: '🌎', group: 'Continents' },
    { id: 'south_america', name: 'South America', icon: '🌎', group: 'Continents' },
    { id: 'oceania', name: 'Oceania', icon: '🌏', group: 'Continents' },
    // African Sub-regions
    { id: 'east_africa', name: 'East Africa', icon: '🌍', group: 'Africa' },
    { id: 'west_africa', name: 'West Africa', icon: '🌍', group: 'Africa' },
    { id: 'north_africa', name: 'North Africa', icon: '🌍', group: 'Africa' },
    { id: 'southern_africa', name: 'Southern Africa', icon: '🌍', group: 'Africa' },
    { id: 'central_africa', name: 'Central Africa', icon: '🌍', group: 'Africa' },
    // European Sub-regions
    { id: 'western_europe', name: 'Western Europe', icon: '🇪🇺', group: 'Europe' },
    { id: 'eastern_europe', name: 'Eastern Europe', icon: '🇪🇺', group: 'Europe' },
    { id: 'northern_europe', name: 'Northern Europe', icon: '🇪🇺', group: 'Europe' },
    { id: 'southern_europe', name: 'Southern Europe', icon: '🇪🇺', group: 'Europe' },
    // Asian Sub-regions
    { id: 'middle_east', name: 'Middle East', icon: '🌏', group: 'Asia' },
    { id: 'southeast_asia', name: 'Southeast Asia', icon: '🌏', group: 'Asia' },
    { id: 'south_asia', name: 'South Asia', icon: '🌏', group: 'Asia' },
    { id: 'east_asia', name: 'East Asia', icon: '🌏', group: 'Asia' },
    { id: 'central_asia', name: 'Central Asia', icon: '🌏', group: 'Asia' },
    // Economic Zones & Trade Blocs
    { id: 'eac', name: 'East African Community (EAC)', icon: '🤝', group: 'Trade Blocs' },
    { id: 'sadc', name: 'SADC (Southern Africa)', icon: '🤝', group: 'Trade Blocs' },
    { id: 'ecowas', name: 'ECOWAS (West Africa)', icon: '🤝', group: 'Trade Blocs' },
    { id: 'comesa', name: 'COMESA', icon: '🤝', group: 'Trade Blocs' },
    { id: 'eu', name: 'European Union (EU)', icon: '🇪🇺', group: 'Trade Blocs' },
    { id: 'gcc', name: 'Gulf Cooperation Council (GCC)', icon: '🤝', group: 'Trade Blocs' },
    { id: 'asean', name: 'ASEAN', icon: '🤝', group: 'Trade Blocs' },
    { id: 'nafta', name: 'NAFTA / USMCA', icon: '🤝', group: 'Trade Blocs' },
    { id: 'mercosur', name: 'Mercosur', icon: '🤝', group: 'Trade Blocs' },
    // Worldwide
    { id: 'worldwide', name: 'Worldwide / Global', icon: '🌐', group: 'Global' },
];

// Mobile-optimized Searchable Multi-Select for Regions
interface MobileRegionMultiSelectProps {
    selectedRegions: string[];
    onChange: (regions: string[]) => void;
    placeholder?: string;
}

const MobileRegionMultiSelect: React.FC<MobileRegionMultiSelectProps> = ({
    selectedRegions,
    onChange,
    placeholder = 'Tap to select regions...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredRegions = PREDEFINED_REGIONS.filter(region =>
        region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.group.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group filtered regions
    const groupedRegions = filteredRegions.reduce((acc, region) => {
        if (!acc[region.group]) acc[region.group] = [];
        acc[region.group].push(region);
        return acc;
    }, {} as Record<string, typeof PREDEFINED_REGIONS>);

    const handleToggleRegion = (regionId: string) => {
        if (selectedRegions.includes(regionId)) {
            onChange(selectedRegions.filter(r => r !== regionId));
        } else {
            onChange([...selectedRegions, regionId]);
        }
    };

    const getRegionName = (id: string) => {
        const region = PREDEFINED_REGIONS.find(r => r.id === id);
        return region ? region.name : id;
    };

    const getRegionIcon = (id: string) => {
        const region = PREDEFINED_REGIONS.find(r => r.id === id);
        return region?.icon || '📍';
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Selected regions chips */}
            {selectedRegions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedRegions.map(regionId => (
                        <div
                            key={regionId}
                            className="bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-orange-200"
                        >
                            <span>{getRegionIcon(regionId)}</span>
                            <span className="truncate max-w-[100px]">{getRegionName(regionId)}</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleRegion(regionId); }}
                                className="text-orange-400 active:text-red-500 transition-colors"
                            >
                                <span className="material-icons text-[12px]">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search input trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-left",
                    selectedRegions.length > 0
                        ? "border-orange-200 bg-orange-50/50"
                        : "border-gray-200 bg-gray-50"
                )}
            >
                <span className="material-icons text-orange-500 text-lg">travel_explore</span>
                <span className="flex-1 text-sm font-medium text-gray-500">{placeholder}</span>
                <span className="material-icons text-gray-400 text-sm">expand_more</span>
            </button>

            {/* Full-screen mobile modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 safe-area-top">
                        <div className="flex items-center justify-between mb-3">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 active:bg-gray-100 p-1 rounded-lg"
                            >
                                <span className="material-icons">close</span>
                            </button>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Select Regions</h3>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold active:bg-orange-700"
                            >
                                Done
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                            <span className="material-icons text-gray-400 text-lg">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search regions..."
                                className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
                                autoFocus
                            />
                            {searchTerm && (
                                <button type="button" onClick={() => setSearchTerm('')} className="text-gray-400">
                                    <span className="material-icons text-sm">clear</span>
                                </button>
                            )}
                        </div>

                        {/* Selected count and clear */}
                        {selectedRegions.length > 0 && (
                            <div className="flex items-center justify-between mt-3 px-1">
                                <span className="text-xs text-gray-500">
                                    <strong className="text-orange-600">{selectedRegions.length}</strong> region(s) selected
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    className="text-[10px] font-bold text-red-500 active:text-red-700 uppercase"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {Object.keys(groupedRegions).length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-icons text-4xl mb-2">search_off</span>
                                <p className="text-sm">No regions found</p>
                            </div>
                        ) : (
                            Object.entries(groupedRegions).map(([group, regions]) => (
                                <div key={group} className="mb-4">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 py-2 sticky top-0 bg-white/95 backdrop-blur-sm">
                                        {group}
                                    </div>
                                    <div className="space-y-1">
                                        {regions.map(region => {
                                            const isSelected = selectedRegions.includes(region.id);
                                            return (
                                                <button
                                                    key={region.id}
                                                    type="button"
                                                    onClick={() => handleToggleRegion(region.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]",
                                                        isSelected
                                                            ? "bg-orange-100 border border-orange-200"
                                                            : "bg-gray-50 border border-gray-100 active:bg-gray-100"
                                                    )}
                                                >
                                                    <span className="text-lg">{region.icon}</span>
                                                    <span className={cn(
                                                        "flex-1 text-sm",
                                                        isSelected ? "font-bold text-orange-800" : "text-gray-700"
                                                    )}>{region.name}</span>
                                                    {isSelected ? (
                                                        <span className="material-icons text-orange-600 text-lg">check_circle</span>
                                                    ) : (
                                                        <span className="material-icons text-gray-300 text-lg">radio_button_unchecked</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const SellerAddProductView: React.FC<SellerAddProductViewProps> = ({
    sellerId,
    onClose,
    onSuccess,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // First-time walkthrough (mobile)
    const walkthroughStorageKey = 'sellerAddProductWalkthroughSeen.mobile.v1';
    const walkthroughSteps = useMemo(() => ([
        {
            step: 0,
            title: 'Basics',
            text: 'Pick the right classification/category first. A good title helps buyers find your listing.'
        },
        {
            step: 1,
            title: 'Attributes',
            text: 'Fill the key specs for better search and fewer customer questions.'
        },
        {
            step: 2,
            title: 'Variants',
            text: 'Add options like Size/Color. You can set per-variant price, original price and stock.'
        },
        {
            step: 3,
            title: 'Pricing & Delivery',
            text: 'Choose currency + unit, enter price/stock, and optionally add wholesale tiers and delivery details.'
        },
        {
            step: 4,
            title: 'Media',
            text: 'Add clear photos (and optional YouTube). Better media improves conversions.'
        },
        {
            step: 5,
            title: 'SEO',
            text: 'Optional: help Google/social previews. You can use AI to generate SEO fields.'
        }
    ]), []);
    const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
    const [walkthroughStep, setWalkthroughStep] = useState(0);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(walkthroughStorageKey);
            if (seen === '1') return;
            setIsWalkthroughOpen(true);
            setWalkthroughStep(0);
        } catch {
            // ignore storage failures
        }
    }, []);

    // --- Dynamic Data State ---
    const [verticals, setVerticals] = useState<ShopifyVertical[]>([]);
    const [categories, setCategories] = useState<ShopifyCategory[]>([]);
    const [brands, setBrands] = useState<ShopifyBrand[]>([]);
    const [availableAttributes, setAvailableAttributes] = useState<ShopifyAttribute[]>([]);
    const [attributeOptionsMap, setAttributeOptionsMap] = useState<Record<string, any[]>>({});
    const [isLoadingVerticals, setIsLoadingVerticals] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);

    const [errorVerticals, setErrorVerticals] = useState<string | undefined>();
    const [errorCategories, setErrorCategories] = useState<string | undefined>();
    const [errorBrands, setErrorBrands] = useState<string | undefined>();
    const [errorAttributes, setErrorAttributes] = useState<string | undefined>();

    // --- Form State ---

    // Step 0: Basics
    const [selectedVertical, setSelectedVertical] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [brandId, setBrandId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [useCaseTags, setUseCaseTags] = useState<string[]>([]);
    const [useCaseInput, setUseCaseInput] = useState('');
    const [occasionTags, setOccasionTags] = useState<string[]>([]);
    const [occasionInput, setOccasionInput] = useState('');

    // Step 1: Attributes
    const [attributes, setAttributes] = useState<ProductAttributeData[]>([]);

    // Step 2: Variants
    const [hasVariants, setHasVariants] = useState(false);
    const [variantOptions, setVariantOptions] = useState<{ id: string; name: string; values: string[] }[]>([]);
    const [variants, setVariants] = useState<ProductVariantData[]>([]);
    const [optionValueInputs, setOptionValueInputs] = useState<Record<string, string>>({});

    // Step 3: Pricing, Inventory & Delivery
    const [price, setPrice] = useState('');
    const [compareAtPrice, setCompareAtPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [deliveryScope, setDeliveryScope] = useState('nationwide');
    const [deliveryCost, setDeliveryCost] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [deliveryTimeDaysInput, setDeliveryTimeDaysInput] = useState('1');
    const [isExpressDelivery, setIsExpressDelivery] = useState(false);
    const [delayCredit, setDelayCredit] = useState('0');
    const [freeDelivery, setFreeDelivery] = useState(false);
    const [minOrderValue, setMinOrderValue] = useState('0');
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState('0');
    const [currency, setCurrency] = useState('USD');
    const [pricingUnit, setPricingUnit] = useState('piece');
    const [deliveryLocations, setDeliveryLocations] = useState<string[]>([]);
    const [deliveryLocationInput, setDeliveryLocationInput] = useState('');
    const [isChoice, setIsChoice] = useState(false);
    const [listingType, setListingType] = useState<'direct_purchase' | 'inquiry' | 'reservation'>('direct_purchase');
    const [condition, setCondition] = useState<ProductCondition>('new');
    const [quantityDiscounts, setQuantityDiscounts] = useState<QuantityDiscountTier[]>([]);

    // Auto-detect seller currency from location (best-effort)
    const didAutoSetCurrency = useRef(false);
    useEffect(() => {
        if (didAutoSetCurrency.current) return;
        didAutoSetCurrency.current = true;

        autoDetectCurrency()
            .then((detected) => {
                if (!detected) return;
                const supported = SUPPORTED_CURRENCIES.some(c => c.code === detected);
                if (!supported) return;

                // Only auto-set if user hasn't changed from default
                setCurrency(prev => (prev === 'USD' ? detected : prev));
            })
            .catch(() => {
                // ignore detection failures
            });
    }, []);

    // Live conversion preview for seller inputs (to USD)
    const conversionTargetCurrency = 'USD';
    const sellerInputConversionValues = useMemo(() => {
        const values: { amount: number; currency: string; id: string }[] = [];

        const basePrice = price ? parseFloat(price) : 0;
        const baseCompare = compareAtPrice ? parseFloat(compareAtPrice) : 0;

        values.push({ id: 'base-price', amount: isNaN(basePrice) ? 0 : basePrice, currency });
        values.push({ id: 'base-compare', amount: isNaN(baseCompare) ? 0 : baseCompare, currency });

        quantityDiscounts.forEach((tier, idx) => {
            values.push({ id: `tier-${idx}`, amount: tier.unit_price || 0, currency });
        });

        variants.forEach((variant, idx) => {
            values.push({ id: `variant-${idx}-price`, amount: variant.price || 0, currency });
            values.push({ id: `variant-${idx}-compare`, amount: typeof variant.compare_at_price === 'number' ? variant.compare_at_price : 0, currency });
        });

        return values;
    }, [price, compareAtPrice, quantityDiscounts, variants, currency]);

    const { convertedValues: sellerConvertedInputs } = useCurrencyConverter(
        sellerInputConversionValues,
        conversionTargetCurrency
    );


    // Step 4: Media & SEO
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploadedMedia, setUploadedMedia] = useState<MediaUploadData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [youtubeInput, setYoutubeInput] = useState('');
    const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);

    // --- AI States ---
    const [isImprovingTitle, setIsImprovingTitle] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [isGeneratingUseCaseTags, setIsGeneratingUseCaseTags] = useState(false);
    const [isGeneratingOccasionTags, setIsGeneratingOccasionTags] = useState(false);



    // --- SEO Metadata State ---
    const [seoTitle, setSeoTitle] = useState('');
    const [metaDescriptionState, setMetaDescriptionState] = useState('');
    const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
    const [urlSlug, setUrlSlug] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');

    // --- Effects ---

    // 1. Initial Load (Verticals)
    const loadVerticals = async () => {
        setIsLoadingVerticals(true);
        setErrorVerticals(undefined);
        try {
            const data = await fetchVerticals();
            setVerticals(data);
        } catch (err) {
            console.error('Failed to fetch verticals:', err);
            setErrorVerticals('Failed to load verticals');
        } finally {
            setIsLoadingVerticals(false);
        }
    };

    useEffect(() => {
        loadVerticals();
    }, []);

    // 2. Fetch Categories when Vertical Changes
    const loadCategories = async (vId: string) => {
        setIsLoadingCategories(true);
        setErrorCategories(undefined);
        try {
            const data = await fetchCategories(vId);
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            setErrorCategories('Failed to load categories');
        } finally {
            setIsLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (selectedVertical) {
            loadCategories(selectedVertical);
            setCategoryId('');
            setBrands([]);
            setAvailableAttributes([]);
            setAttributes([]);
        } else {
            setCategories([]);
        }
    }, [selectedVertical]);

    // 3. Fetch Brands & Attributes when Category Changes
    const loadBrandsAndAttributes = async (cId: string) => {
        setIsLoadingBrands(true);
        setIsLoadingAttributes(true);
        setErrorBrands(undefined);
        setErrorAttributes(undefined);

        // Fetch brands
        fetchBrands(cId)
            .then(setBrands)
            .catch(err => {
                console.error('Failed to fetch brands:', err);
                setErrorBrands('Failed to load brands');
            })
            .finally(() => setIsLoadingBrands(false));

        // Fetch attributes
        fetchAttributes(cId)
            .then((attrs) => {
                setAvailableAttributes(attrs);
                setAttributeOptionsMap({});
            })
            .catch(err => {
                console.error('Failed to fetch attributes:', err);
                setErrorAttributes('Failed to load attributes');
            })
            .finally(() => setIsLoadingAttributes(false));
    };

    useEffect(() => {
        if (categoryId) {
            loadBrandsAndAttributes(categoryId);
            setBrandId('');
            setAttributes([]);
        } else {
            setBrands([]);
            setAvailableAttributes([]);
        }
    }, [categoryId]);

    // 4. Auto-load Attribute Options
    useEffect(() => {
        availableAttributes.forEach(attr => {
            if (!attributeOptionsMap[attr.id]) {
                fetchAttributeOptions(attr.id).then(opts => {
                    setAttributeOptionsMap(prev => ({ ...prev, [attr.id]: opts }));
                });
            }
        });
    }, [availableAttributes]);

    // 5. Variant Generation (Cartesian Product)
    useEffect(() => {
        if (!hasVariants) {
            setVariants([]);
            return;
        }
        if (variantOptions.length === 0) return;

        // Recursive combination generator
        const generateCombinations = (options: typeof variantOptions, index = 0, current: Record<string, string> = {}): Record<string, string>[] => {
            if (index === options.length) return [current];
            const option = options[index];
            if (option.values.length === 0) return generateCombinations(options, index + 1, current);

            let combos: Record<string, string>[] = [];
            for (const val of option.values) {
                combos = [...combos, ...generateCombinations(options, index + 1, { ...current, [option.name]: val })];
            }
            return combos;
        };

        const combos = generateCombinations(variantOptions);
        const baseP = parseFloat(price) || 10; // Default to 10 if no base price set
        const baseS = parseInt(stock) || 1;   // Default to 1 if no base stock set

        // Create variants, preserving existing data if matching options found
        const newVariants = combos.map((combo, idx) => {
            // Robust comparison instead of JSON.stringify to prevent order issues
            const existing = variants.find(v => {
                const keysV = Object.keys(v.options);
                const keysC = Object.keys(combo);
                if (keysV.length !== keysC.length) return false;
                return keysV.every(k => v.options[k] === combo[k]);
            });

            return {
                sku: existing?.sku || `${title.substring(0, 3).toUpperCase()}-${Object.values(combo).join('-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
                price: (typeof existing?.price === 'number' && !isNaN(existing.price)) ? existing.price : baseP,
                compare_at_price: (typeof existing?.compare_at_price === 'number' && !isNaN(existing.compare_at_price)) ? existing.compare_at_price : undefined,
                original_price: (typeof existing?.original_price === 'number' && !isNaN(existing.original_price)) ? existing.original_price : undefined,
                stock: (typeof existing?.stock === 'number' && !isNaN(existing.stock)) ? existing.stock : baseS,
                options: combo,
                is_default: existing ? existing.is_default : (idx === 0), // Preserve or default to first
                image_url: existing?.image_url
            };
        });

        // Ensure exactly one default exists if we have variants
        if (newVariants.length > 0 && !newVariants.some(v => v.is_default)) {
            newVariants[0].is_default = true;
        }

        setVariants(newVariants);
    }, [variantOptions, hasVariants, title]); // Don't depend on price/stock changes to avoid overwriting custom variant edits

    // --- AI Handlers ---
    const handleImproveTitle = async () => {
        if (!title.trim()) return;
        const cat = categories.find(c => c.id === categoryId)?.name;

        const isAmbiguousCategory = (name?: string) => {
            if (!name) return false;
            return name.includes('&') || /\band\b/i.test(name);
        };

        const inferTitleFocus = (t: string) => {
            const lower = t.toLowerCase();
            const looksLikeAccessory = /\b(mount|wall\s*mount|bracket|holder|stand|rack|arm)\b/i.test(lower);
            if (!looksLikeAccessory) return '';
            return `${t}. This is an accessory/mount/bracket (NOT the TV/monitor itself). Improve the title for the mount/accessory only.`;
        };

        const inferred = inferTitleFocus(title);


        setIsImprovingTitle(true);
        try {
            const focus = inferred || (isAmbiguousCategory(cat) ? title : undefined);
            const res = await aiService.improveTitle(title, cat, focus);
            if (res) setTitle(res);
        } finally {
            setIsImprovingTitle(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!title.trim()) return;
        const cat = categories.find(c => c.id === categoryId)?.name;

        const isAmbiguousCategory = (name?: string) => {
            if (!name) return false;
            return name.includes('&') || /\band\b/i.test(name);
        };

        const inferDescriptionFocus = (t: string) => {
            const lower = t.toLowerCase();
            const looksLikeAccessory = /\b(mount|wall\s*mount|bracket|holder|stand|rack|arm)\b/i.test(lower);
            if (!looksLikeAccessory) return '';
            return `${t}. This is an accessory/mount/bracket (NOT the TV/monitor itself). Write the description for the mount/accessory only.`;
        };

        setIsGeneratingDescription(true);
        try {
            const inferred = inferDescriptionFocus(title);
            const focus = inferred || (isAmbiguousCategory(cat) ? title : undefined);
            const res = await aiService.generateDescription(title, cat, attributes, focus);
            if (res) {
                setDescription(res);
                // Also default the meta description
                if (!metaDescriptionState) setMetaDescriptionState(res.substring(0, 160));
            }
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateSEO = async () => {
        if (!title.trim()) return;
        setIsGeneratingSEO(true);
        try {
            const res = await aiService.generateSEO(title, description);
            if (res) {
                if (res.seo_title) setSeoTitle(res.seo_title);
                if (res.meta_description) setMetaDescriptionState(res.meta_description);
                if (res.keywords) {
                    const kws = res.keywords.split(',').map(k => k.trim()).filter(Boolean);
                    setSeoKeywords(kws);
                }
                // Auto-generate slug from SEO title or title
                const slugSource = res.seo_title || title;
                setUrlSlug(slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
            }
        } catch (err) {
            console.error('SEO Generation error:', err);
        } finally {
            setIsGeneratingSEO(false);
        }
    };

    const handleGenerateTags = async () => {
        if (!title.trim()) return;
        setIsGeneratingTags(true);
        try {
            const cat = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateTags(title, cat);
            if (res && res.length > 0) {
                setTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (err) {
            console.error('Tags generation error:', err);
        } finally {
            setIsGeneratingTags(false);
        }
    };

    const handleGenerateUseCaseTags = async () => {
        if (!title.trim()) return;
        setIsGeneratingUseCaseTags(true);
        try {
            const cat = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateUseCaseTags(title, cat);
            if (res && res.length > 0) {
                setUseCaseTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (err) {
            console.error('Use case tags generation error:', err);
        } finally {
            setIsGeneratingUseCaseTags(false);
        }
    };

    const handleGenerateOccasionTags = async () => {
        if (!title.trim()) return;
        setIsGeneratingOccasionTags(true);
        try {
            const cat = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateOccasionTags(title, cat);
            if (res && res.length > 0) {
                setOccasionTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (err) {
            console.error('Occasion tags generation error:', err);
        } finally {
            setIsGeneratingOccasionTags(false);
        }
    };

    // --- Handlers ---

    const handleNext = () => {
        // Step 0: Basic Info validation
        if (currentStep === 0) {
            if (!title?.trim()) {
                alert('Product title is required.');
                return;
            }
            if (title.trim().length < 3) {
                alert('Title is too short. Please provide at least 3 characters.');
                return;
            }
            if (description && description.trim().length < 10) {
                alert('Description is too short. Please provide at least 10 characters.');
                return;
            }
            if (!categoryId?.trim()) {
                alert('Please select a category for your product.');
                return;
            }
            if (!listingType) {
                alert('Please select a purchase mode (Add to Cart, Inquiry, or Reservation).');
                return;
            }
        }

        // Step 1: Attributes - warn but don't block
        if (currentStep === 1) {
            if (attributes.length === 0) {
                const proceed = confirm('You haven\'t added any specific attributes (e.g., Color, Material). Attributes help buyers find your products faster. Continue anyway?');
                if (!proceed) return;
            }
        }

        // Step 2: Pricing & Variants validation
        if (currentStep === 2) {
            if (hasVariants) {
                if (variantOptions.length === 0 || variants.length === 0) {
                    alert('Please add at least one variant option and values if "Has Variants" is enabled.');
                    return;
                }
                // Validate all variants have valid prices
                const variantsWithoutPrice = variants.filter(v => typeof v.price !== 'number' || v.price <= 0);
                if (variantsWithoutPrice.length > 0) {
                    const variantNames = variantsWithoutPrice.map(v => Object.values(v.options || {}).join(' / ') || 'Unnamed').join(', ');
                    alert(`Please set a valid price for all variants:\n${variantNames}`);
                    return;
                }
                // Validate each variant's compare_at_price
                for (const variant of variants) {
                    if (typeof variant.compare_at_price === 'number' && variant.compare_at_price > 0) {
                        if (variant.price > variant.compare_at_price) {
                            const variantName = Object.values(variant.options || {}).join(' / ') || 'Unnamed';
                            alert(`Selling price for "${variantName}" (${getCurrencySymbol(currency)}${variant.price}) cannot be greater than the original price (${getCurrencySymbol(currency)}${variant.compare_at_price}).`);
                            return;
                        }
                    }
                }
            }
        }

        // Step 3: Pricing & Delivery validation
        if (currentStep === 3) {
            if (!hasVariants) {
                const numPrice = parseFloat(price);
                const numCompare = compareAtPrice ? parseFloat(compareAtPrice) : undefined;

                if (isNaN(numPrice) || numPrice <= 0) {
                    alert('Please enter a valid selling price greater than 0.');
                    return;
                }

                if (typeof numCompare === 'number' && !isNaN(numCompare) && numCompare > 0) {
                    if (numPrice > numCompare) {
                        alert(`Selling price (${getCurrencySymbol(currency)}${numPrice}) cannot be greater than the original price (${getCurrencySymbol(currency)}${numCompare}).\n\nThe original price should be higher to show a valid discount.`);
                        return;
                    }
                }
            }

            // Delivery Validation
            if (!deliveryTime) {
                alert('Please select an estimated delivery time.');
                return;
            }

            if (deliveryScope === 'regional' || deliveryScope === 'local') {
                if (deliveryLocations.length === 0) {
                    alert(`Please add at least one ${deliveryScope === 'regional' ? 'region' : 'location/city'} for your selected delivery scope.`);
                    return;
                }
            }

            if (parseFloat(deliveryCost) < 0) {
                alert('Delivery cost cannot be negative.');
                return;
            }
        }

        // Step 4: Media - warn but don't block
        if (currentStep === 4) {
            if (uploadedMedia.length === 0 && youtubeUrls.length === 0) {
                const proceed = confirm('You haven\'t added any images. Products with images sell better. Continue anyway?');
                if (!proceed) return;
            }
        }

        // Step 5: SEO validation before final move (not strictly necessary for next but good for consistency)
        if (currentStep === 5) {
            if (urlSlug && !/^[a-z0-9-]+$/.test(urlSlug)) {
                alert('Slug should only contain lowercase letters, numbers, and hyphens.');
                return;
            }
        }

        // If all validations pass, move to next step
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    // Attribute Handler
    const handleAttributeChange = (attrId: string, value: string, optionId?: string) => {
        setAttributes(prev => {
            const others = prev.filter(p => p.attribute_id !== attrId);
            const def = availableAttributes.find(a => a.id === attrId);
            return [...others, {
                attribute_id: attrId,
                name: def?.name || '',
                value: value,
                value_option_id: optionId,
                value_text: value
            }];
        });
    };

    // Variant Handlers
    const addVariantOption = (name: string, initialValues: string[] = []) => {
        if (variantOptions.some(o => o.name.toLowerCase() === name.toLowerCase())) return;
        setVariantOptions(prev => [...prev, { id: Date.now().toString(), name, values: initialValues }]);
    };

    const addVariantValue = (optionIndex: number, value: string) => {
        const option = variantOptions[optionIndex];
        const valuesToAdd = value.split(',').map(v => v.trim()).filter(Boolean);
        if (valuesToAdd.length === 0) return;

        const newOpts = [...variantOptions];
        const currentValues = option.values || [];
        const uniqueNewValues = valuesToAdd.filter(v => !currentValues.includes(v));

        if (uniqueNewValues.length === 0) return;

        newOpts[optionIndex] = {
            ...option,
            values: [...currentValues, ...uniqueNewValues]
        };
        setVariantOptions(newOpts);
    };

    // Media Handlers
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files || []) as File[];
            setMediaFiles(prev => [...prev, ...files]);
            setIsUploading(true);
            try {
                const startPos = uploadedMedia.length;
                const results = await MediaService.getInstance().uploadFiles(files, sellerId);
                const newUploads = results.map((res, idx) => ({
                    url: res.url,
                    storage_path: res.storage_path,
                    media_type: res.media_type,
                    is_main: startPos === 0 && idx === 0,
                    position: startPos + idx,
                    alt_text: title
                }));
                setUploadedMedia(prev => [...prev, ...newUploads]);
            } catch (err) { alert("Upload failed."); }
            finally { setIsUploading(false); }
        }
    };

    const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            try {
                const results = await MediaService.getInstance().uploadFiles([file], sellerId);
                if (results[0]) {
                    setVariants(prev => {
                        const newVariants = [...prev];
                        newVariants[index].image_url = results[0].url;
                        return newVariants;
                    });
                }
            } catch (error) {
                console.error('Variant image upload failed:', error);
                alert('Failed to upload variant image.');
            }
        }
    };

    const handleSubmit = async () => {
        // Aggregate Validation
        if (!categoryId || !categoryId.trim()) {
            alert('Please select a category for your product.');
            return;
        }

        if (!title || !title.trim()) {
            alert('Please enter a product title.');
            return;
        }

        const numPrice = parseFloat(price) || 0;
        const numCompare = compareAtPrice ? parseFloat(compareAtPrice) : 0;
        const numStock = parseInt(stock) || 0;

        // Final Price Checks
        if (!hasVariants) {
            if (numPrice <= 0) {
                alert('Please set a valid selling price greater than 0.');
                return;
            }
            if (numCompare > 0 && numPrice > numCompare) {
                alert('Original/compare-at price should be higher than or equal to the selling price.');
                return;
            }
        } else {
            if (!variants || variants.length === 0 || !variants.every(v => typeof v.price === 'number' && v.price > 0)) {
                alert('Please set prices for all product variants.');
                return;
            }
        }

        if (!deliveryTime) {
            alert('Please select a delivery time estimate.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Merge uploaded media with YouTube URLs
            const youtubeMedia = youtubeUrls.map((url, idx) => ({
                url,
                storage_path: '',
                media_type: 'youtube',
                is_main: false,
                position: uploadedMedia.length + idx,
                alt_text: title
            }));

            const allMedia = [...uploadedMedia, ...youtubeMedia];

            const safeTags = tags.map(t => t.trim()).filter(Boolean);
            const safeUseCases = useCaseTags.map(t => t.trim()).filter(Boolean);
            const safeOccasions = occasionTags.map(t => t.trim()).filter(Boolean);
            const joinedSeoKeywords = seoKeywords.map(k => k.trim()).filter(Boolean).join(', ');

            // Sanitize numeric fields and calculate discounts
            const preparedVariants = (hasVariants ? variants : [{
                sku: `${title.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
                price: numPrice,
                compare_at_price: numCompare || numPrice,
                original_price: numCompare || numPrice,
                stock: numStock,
                options: {},
                is_default: true
            }]).map(v => {
                const p = Number(v.price) || 0;
                const rrp = Number(v.compare_at_price || v.original_price || p);
                const discountPercent = rrp > p ? Math.round(((rrp - p) / rrp) * 100) : 0;

                return {
                    ...v,
                    price: p,
                    stock: Number(v.stock) || 0,
                    compare_at_price: rrp,
                    original_price: rrp,
                    rrp,
                    discount_percent: discountPercent
                };
            });

            // Dynamically look up Pricing Unit attribute
            const pricingUnitAttr = availableAttributes.find(a => a.name.toLowerCase().includes('unit'));
            const finalAttributes = [...attributes];

            if (pricingUnitAttr) {
                const existingIdx = finalAttributes.findIndex(a => a.attribute_id === pricingUnitAttr.id);
                const attrObj = {
                    attribute_id: pricingUnitAttr.id,
                    name: pricingUnitAttr.name,
                    value: pricingUnit,
                    value_text: pricingUnit,
                    is_custom: false
                };
                if (existingIdx > -1) {
                    finalAttributes[existingIdx] = attrObj;
                } else {
                    finalAttributes.push(attrObj);
                }
            }

            const deliveryTimeDaysParsed = parseInt(deliveryTimeDaysInput, 10) || 1;

            const payload = {
                title: title.trim(),
                description: description.trim(),
                category_id: categoryId,
                brand_id: brandId || undefined,
                currency: currency,
                variants: preparedVariants,
                media: allMedia.map((m, i) => ({ ...m, position: i })),
                tags: safeTags,
                use_case_tags: safeUseCases,
                occasion_tags: safeOccasions,
                attributes: finalAttributes,
                seo_title: seoTitle.trim() || title.trim(),
                meta_description: metaDescriptionState.trim() || description.substring(0, 160).trim(),
                url_slug: urlSlug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                canonical_url: canonicalUrl?.trim() || undefined,
                seo_keywords: joinedSeoKeywords || undefined,
                delivery_scope: deliveryScope,
                delivery_cost: Number(deliveryCost) || 0,
                delivery_time_estimate: deliveryTime,
                delivery_time_days: deliveryTimeDaysParsed,
                is_express_delivery: !!isExpressDelivery,
                delay_credit: Number(delayCredit) || 0,
                free_delivery: !!freeDelivery,
                min_order_value: Number(minOrderValue) || 0,
                min_order_for_free_delivery: Number(minOrderForFreeDelivery) || 0,
                is_choice: !!isChoice,
                delivery_locations: deliveryLocations,
                sale_unit: pricingUnit,
                is_active: true,
                listing_type: listingType,
                quantity_discounts: quantityDiscounts,
                condition: condition
            };

            const pid = await createProductFull(sellerId, payload, preparedVariants, payload.media, finalAttributes, quantityDiscounts);
            if (pid) {
                alert("Published! Your product is now pending approval.");
                onSuccess();
            } else {
                throw new Error("Failed to create product record.");
            }
        } catch (error: any) {
            console.error('Mobile submission failed:', error);
            alert(`Failed to publish product: ${error.message || 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-white shadow-sm z-10 safe-area-top">
                <button onClick={onClose} className="text-gray-500 p-2 -ml-2"><span className="material-icons">close</span></button>
                <div className="font-bold text-gray-900">New Listing</div>
                <div className="w-10"></div>
            </div>

            {/* Steps */}
            <div className="flex bg-gray-50 border-b overflow-x-auto no-scrollbar">
                {STEPS.map((step, index) => (
                    <div key={step} className={cn(
                        "flex-1 py-3 px-4 text-center text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                        index === currentStep ? "border-orange-500 text-orange-600" : index < currentStep ? "border-green-500 text-green-600" : "border-transparent text-gray-400"
                    )}>
                        {step}
                    </div>
                ))}
            </div>

            {/* Walkthrough Banner */}
            {isWalkthroughOpen && walkthroughSteps[walkthroughStep] && (
                <div className="px-4 py-3 border-b bg-white">
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="material-icons text-gray-600 text-sm">tips_and_updates</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-black uppercase tracking-wider text-gray-900">
                                {walkthroughSteps[walkthroughStep].title}
                            </div>
                            <div className="text-[11px] text-gray-600 mt-0.5">
                                {walkthroughSteps[walkthroughStep].text}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWalkthroughOpen(false);
                                        try { localStorage.setItem(walkthroughStorageKey, '1'); } catch { /* ignore */ }
                                    }}
                                    className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 active:scale-95 transition"
                                >
                                    Skip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = walkthroughStep + 1;
                                        if (next >= walkthroughSteps.length) {
                                            setIsWalkthroughOpen(false);
                                            try { localStorage.setItem(walkthroughStorageKey, '1'); } catch { /* ignore */ }
                                            return;
                                        }
                                        setWalkthroughStep(next);
                                        setCurrentStep(walkthroughSteps[next].step);
                                    }}
                                    className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-sm active:scale-95 transition"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 pb-24">

                {/* Step 0: Basics */}
                {currentStep === 0 && (
                    <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                        <div className="space-y-4">
                            <SearchableSelect
                                label="Classification"
                                value={selectedVertical}
                                options={verticals}
                                onChange={setSelectedVertical}
                                placeholder="Select Vertical"
                                isLoading={isLoadingVerticals}
                                error={errorVerticals}
                                onRetry={loadVerticals}
                            />
                            <SearchableSelect
                                value={categoryId}
                                options={categories}
                                onChange={setCategoryId}
                                placeholder="Select Category"
                                disabled={!selectedVertical}
                                isLoading={isLoadingCategories}
                                error={errorCategories}
                                onRetry={() => loadCategories(selectedVertical)}
                            />
                            <SearchableSelect
                                value={brandId}
                                options={brands}
                                onChange={setBrandId}
                                placeholder="Select Brand (Optional)"
                                disabled={!categoryId}
                                isLoading={isLoadingBrands}
                                error={errorBrands}
                                onRetry={() => {
                                    if (categoryId) {
                                        setIsLoadingBrands(true);
                                        setErrorBrands(undefined);
                                        fetchBrands(categoryId).then(setBrands).catch(() => setErrorBrands('Failed to load brands')).finally(() => setIsLoadingBrands(false));
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-1">

                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Details</label>
                                <button
                                    onClick={handleImproveTitle}
                                    disabled={isImprovingTitle || !title.trim()}
                                    className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                                >
                                    <span className={`material-icons text-[12px] ${isImprovingTitle ? 'animate-spin' : ''}`}>
                                        {isImprovingTitle ? 'sync' : 'auto_awesome'}
                                    </span>
                                    {isImprovingTitle ? 'IMPROVING...' : 'AI IMPROVE'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={100}
                                    placeholder="Product Title"
                                    className="w-full border p-3 rounded-lg pr-16"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className={`text-[10px] font-bold ${title.length > 90 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {title.length}/100
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-3 mb-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Description</label>
                                <button
                                    onClick={handleGenerateDescription}
                                    disabled={isGeneratingDescription || !title.trim()}
                                    className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                                >
                                    <span className={`material-icons text-[12px] ${isGeneratingDescription ? 'animate-spin' : ''}`}>
                                        {isGeneratingDescription ? 'sync' : 'auto_awesome'}
                                    </span>
                                    {isGeneratingDescription ? 'WRITING...' : 'AI WRITE'}
                                </button>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    maxLength={3000}
                                    placeholder="Description..."
                                    className="w-full border p-3 rounded-lg h-32 pr-4 pb-8"
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 border rounded-full">
                                    <div className={`w-1.5 h-1.5 rounded-full ${description.length >= 3000 ? 'bg-red-500' : description.length > 2500 ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                    <span className={`text-[10px] font-bold ${description.length >= 3000 ? 'text-red-600' : 'text-gray-500'}`}>
                                        {description.length}/3k
                                    </span>
                                </div>
                            </div>
                        </div>



                        {/* Purchase Mode / Listing Type */}
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <label className="text-xs font-bold uppercase text-gray-900 tracking-wider">Purchase Mode</label>
                                <div className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase rounded tracking-tighter">Required</div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { id: 'direct_purchase', icon: 'shopping_cart', title: 'Add to Cart', desc: 'Standard checkout', color: 'orange' },
                                    { id: 'inquiry', icon: 'chat', title: 'Inquiry Only', desc: 'Cars, Land, Services', color: 'blue' },
                                    { id: 'reservation', icon: 'event_available', title: 'Reservation', desc: 'Book now, pay later', color: 'green' }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setListingType(mode.id as any)}
                                        className={cn(
                                            "relative flex items-center p-4 rounded-xl border-2 transition-all text-left group overflow-hidden",
                                            listingType === mode.id
                                                ? `border-${mode.color}-400 bg-${mode.color}-50/50 shadow-sm`
                                                : "border-gray-100 bg-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors",
                                            listingType === mode.id ? `bg-${mode.color}-500 text-white` : "bg-gray-100 text-gray-400"
                                        )}>
                                            <span className="material-icons text-xl">{mode.icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className={cn("font-bold text-sm", listingType === mode.id ? `text-${mode.color}-900` : "text-gray-900")}>{mode.title}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-black mt-0.5 leading-tight">{mode.desc}</div>
                                        </div>
                                        {listingType === mode.id && (
                                            <span className={`material-icons text-${mode.color}-500`}>check_circle</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Product Type Selection - Early decision */}
                        <div className="pt-6 border-t border-gray-100">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <span className="material-icons text-lg">inventory_2</span>
                                    Product Type
                                </h4>
                                <p className="text-sm text-blue-700 mb-4">Choose how you'll sell this product.</p>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-medium ${!hasVariants ? 'text-orange-600' : 'text-gray-500'}`}>Simple Product</span>
                                        <div
                                            onClick={() => setHasVariants(!hasVariants)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${hasVariants ? "bg-orange-500" : "bg-gray-300"}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hasVariants ? "translate-x-6" : ""}`} />
                                        </div>
                                        <span className={`text-sm font-medium ${hasVariants ? 'text-orange-600' : 'text-gray-500'}`}>Multiple Variants</span>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-white rounded border">
                                    {!hasVariants ? (
                                        <div className="text-sm text-gray-600">
                                            <strong>Simple Product:</strong> Single price and stock level. Best for products without variations.
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            <strong>Multiple Variants:</strong> Different prices and stock for variations. Each combination becomes a separate purchasable item.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Product Condition */}
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <label className="text-xs font-bold uppercase text-gray-900 tracking-wider">Product Condition</label>
                                <div className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase rounded tracking-tighter">Required</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'new', icon: 'new_releases', title: 'New', desc: 'Factory sealed' },
                                    { id: 'used', icon: 'history', title: 'Used', desc: 'Previously owned' },
                                    { id: 'refurbished', icon: 'build', title: 'Refurbished', desc: 'Restored to new' },
                                    { id: 'open_box', icon: 'inventory_2', title: 'Open Box', desc: 'Opened but unused' },
                                    { id: 'digital', icon: 'cloud_download', title: 'Digital', desc: 'Digital delivery' }
                                ].map((cond) => (
                                    <button
                                        key={cond.id}
                                        type="button"
                                        onClick={() => setCondition(cond.id as ProductCondition)}
                                        className={cn(
                                            "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                                            condition === cond.id
                                                ? "border-orange-400 bg-orange-50/50 shadow-sm"
                                                : "border-gray-100 bg-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
                                            condition === cond.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                                        )}>
                                            <span className="material-icons text-xl">{cond.icon}</span>
                                        </div>
                                        <div className={cn("font-bold text-sm", condition === cond.id ? "text-orange-900" : "text-gray-900")}>{cond.title}</div>
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mt-0.5">{cond.desc}</div>
                                        {condition === cond.id && (
                                            <span className="absolute top-2 right-2 material-icons text-orange-500 text-base">check_circle</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1: Attributes */}
                {currentStep === 1 && (
                    <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-sm text-gray-500 mb-2">Specify technical specs for better search visibility.</div>
                        {errorAttributes ? (
                            <div className="p-8 text-center bg-red-50/30 rounded-2xl border-2 border-dashed border-red-100">
                                <span className="material-icons text-4xl text-red-300 mb-3">error_outline</span>
                                <p className="text-red-500 font-bold text-sm">Failed to load attributes</p>
                                <button
                                    onClick={() => loadBrandsAndAttributes(categoryId)}
                                    className="mt-4 bg-white border border-red-100 text-red-500 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                                >
                                    Retry Loading
                                </button>
                            </div>
                        ) : isLoadingAttributes ? (
                            <div className="space-y-6">
                                <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <span className="material-icons text-4xl text-gray-300 animate-spin mb-3">sync</span>
                                    <p className="text-gray-400 font-bold text-sm">Loading attributes...</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Fetching requirements for this category</p>
                                </div>
                                {[1, 2].map(i => (
                                    <div key={i} className="space-y-2 animate-pulse opacity-50">
                                        <div className="h-4 w-32 bg-gray-200 rounded" />
                                        <div className="h-10 w-full bg-gray-100 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        ) : availableAttributes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">No specific attributes found for this category. You can skip this step.</div>
                        ) : (
                            availableAttributes.map(attr => {
                                const current = attributes.find(a => a.attribute_id === attr.id)?.value || '';
                                const options = attributeOptionsMap[attr.id] || [];
                                return (
                                    <div key={attr.id} className="space-y-1">
                                        <label className="text-sm font-bold text-gray-800">{attr.name}</label>
                                        {options.length > 0 ? (
                                            <select
                                                value={current}
                                                onChange={e => {
                                                    const opt = options.find(o => o.value === e.target.value);
                                                    handleAttributeChange(attr.id, e.target.value, opt?.id);
                                                }}
                                                className="w-full border p-3 rounded-lg bg-white"
                                            >
                                                <option value="">Select {attr.name}...</option>
                                                {options.map((opt: any) => <option key={opt.id} value={opt.value}>{opt.value}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                value={current}
                                                onChange={e => handleAttributeChange(attr.id, e.target.value)}
                                                placeholder={`Enter ${attr.name}`}
                                                className="w-full border p-3 rounded-lg"
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Step 2: Pricing & Variants */}
                {currentStep === 2 && (
                    <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">

                        {/* Pricing Unit & Currency - Always visible */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing Unit & Currency</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col justify-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Currency</label>
                                        <FieldHelp
                                            text="Choose the currency you will enter prices in. We show an approximate USD conversion under your prices."
                                        />
                                    </div>
                                    <select
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value)}
                                        className="bg-white border text-xs font-bold rounded-lg px-2 py-1.5 focus:border-orange-500 outline-none"
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit</label>
                                        <FieldHelp
                                            text="This is the sale unit shown to buyers (e.g. per piece, per kg)."
                                        />
                                    </div>
                                    <select
                                        value={pricingUnit}
                                        onChange={e => setPricingUnit(e.target.value)}
                                        className="bg-white border text-xs font-bold rounded-lg px-2 py-1.5 focus:border-orange-500 outline-none"
                                    >
                                        {['piece', 'kg', 'g', 'L', 'ml', 'meter', 'box', 'pack', 'pair', 'dozen'].map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {hasVariants && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Product Options</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Quick add:</span>
                                        <button
                                            onClick={() => addVariantOption('Color', ['Black', 'White', 'Blue'])}
                                            className="px-2 py-0.5 bg-orange-50 rounded-full text-[10px] font-bold text-orange-700 border border-orange-100 active:scale-95 transition-transform"
                                        >
                                            Color
                                        </button>
                                        <button
                                            onClick={() => addVariantOption('Size', ['S', 'M', 'L', 'XL'])}
                                            className="px-2 py-0.5 bg-orange-50 rounded-full text-[10px] font-bold text-orange-700 border border-orange-100 active:scale-95 transition-transform"
                                        >
                                            Size
                                        </button>
                                    </div>
                                </div>

                                {variantOptions.map((opt, idx) => (
                                    <div key={opt.id} className="p-4 border rounded-2xl bg-white shadow-sm space-y-4 relative overflow-hidden">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block px-1">Option Name</label>
                                                <input
                                                    list={`option-names-${idx}`}
                                                    value={opt.name}
                                                    onChange={e => {
                                                        const n = [...variantOptions];
                                                        n[idx].name = e.target.value;
                                                        setVariantOptions(n);
                                                    }}
                                                    className="w-full font-bold text-gray-900 bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500"
                                                    placeholder="e.g. Color"
                                                />
                                                <datalist id={`option-names-${idx}`}>
                                                    <option value="Color" />
                                                    <option value="Size" />
                                                    <option value="Material" />
                                                    <option value="Style" />
                                                    <option value="Weight" />
                                                </datalist>
                                            </div>
                                            <button
                                                onClick={() => setVariantOptions(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-gray-300 hover:text-red-500 transition-colors pt-6"
                                            >
                                                <span className="material-icons text-xl">delete_outline</span>
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block px-1">Option Values</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {opt.values.map(val => (
                                                    <div key={val} className="bg-white text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-100 shadow-sm">
                                                        {val}
                                                        <button
                                                            onClick={() => {
                                                                const n = [...variantOptions];
                                                                n[idx].values = n[idx].values.filter(v => v !== val);
                                                                setVariantOptions(n);
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <span className="material-icons text-[14px]">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <input
                                                        value={optionValueInputs[opt.id] || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setOptionValueInputs(prev => ({ ...prev, [opt.id]: val }));
                                                            if (val.endsWith(',')) {
                                                                addVariantValue(idx, val);
                                                                setOptionValueInputs(prev => ({ ...prev, [opt.id]: '' }));
                                                            }
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = (optionValueInputs[opt.id] || '').trim();
                                                                if (val) {
                                                                    addVariantValue(idx, val);
                                                                    setOptionValueInputs(prev => ({ ...prev, [opt.id]: '' }));
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Type value and press Enter"
                                                        className="w-full border-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const val = (optionValueInputs[opt.id] || '').trim();
                                                        if (val) { addVariantValue(idx, val); setOptionValueInputs(prev => ({ ...prev, [opt.id]: '' })); }
                                                    }}
                                                    className="bg-orange-600 text-white px-4 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform font-bold text-[10px] tracking-wider"
                                                >
                                                    ADD
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => addVariantOption('')}
                                    className="w-full border-2 border-dashed border-gray-200 p-4 rounded-2xl text-orange-600 font-bold text-sm bg-orange-50/10 hover:bg-orange-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <span className="material-icons">add</span>
                                    Add Another Option
                                </button>
                            </>
                        )}

                        <div className="space-y-4 mt-4">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Preview Variants ({variants.length})</h3>
                            <div className="max-h-80 overflow-y-auto space-y-3 pt-2">
                                {variants.map((v, i) => (
                                    <div key={i} className="p-3 border rounded-xl bg-white shadow-sm space-y-3">
                                        <div className="flex items-center gap-4">
                                            {/* Variant Image Upload */}
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    id={`variant-img-${i}`}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleVariantImageUpload(i, e)}
                                                />
                                                <label
                                                    htmlFor={`variant-img-${i}`}
                                                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 overflow-hidden cursor-pointer"
                                                >
                                                    {v.image_url ? (
                                                        <img src={v.image_url} alt="Variant" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <span className="material-icons text-gray-400 text-lg">add_a_photo</span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Image</span>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-gray-900 mb-1">{Object.values(v.options).join(' / ')}</div>
                                                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{v.sku}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const n = variants.map((varItem, idx) => ({
                                                                ...varItem,
                                                                is_default: idx === i
                                                            }));
                                                            setVariants(n);
                                                        }}
                                                        className={cn(
                                                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all",
                                                            v.is_default
                                                                ? "bg-green-100 text-green-700 border-green-200"
                                                                : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                                                        )}
                                                    >
                                                        {v.is_default ? "Default" : "Make Default"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-50">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</label>
                                                    <FieldHelp text="Variant selling price for this option (e.g. Size M / Blue)." />
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{getCurrencySymbol(currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={v.price}
                                                        onChange={e => {
                                                            const n = [...variants];
                                                            const parsed = parseFloat(e.target.value);
                                                            n[i].price = isNaN(parsed) ? 0 : parsed;
                                                            setVariants(n);
                                                        }}
                                                        className="w-full border-none bg-gray-50 rounded-lg py-2 pl-8 pr-3 text-[11px] font-bold focus:ring-2 focus:ring-orange-500"
                                                        placeholder="Price"
                                                    />
                                                </div>
                                                {currency !== conversionTargetCurrency && v.price > 0 && sellerConvertedInputs[`variant-${i}-price`]?.converted && (
                                                    <div className="text-[9px] text-gray-500 mt-1 px-1">≈ {sellerConvertedInputs[`variant-${i}-price`].converted}</div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Original Price</label>
                                                    <FieldHelp text="Optional anchor/compare price for this variant (used to show discounts)." />
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{getCurrencySymbol(currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={v.compare_at_price || ''}
                                                        onChange={e => {
                                                            const n = [...variants];
                                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                            n[i].compare_at_price = val;
                                                            n[i].original_price = val; // parity
                                                            setVariants(n);
                                                        }}
                                                        className="w-full border-none bg-gray-50 rounded-lg py-2 pl-8 pr-3 text-[11px] font-bold focus:ring-2 focus:ring-orange-500"
                                                        placeholder="Anchor"
                                                    />
                                                </div>
                                                {currency !== conversionTargetCurrency && typeof v.compare_at_price === 'number' && v.compare_at_price > 0 && sellerConvertedInputs[`variant-${i}-compare`]?.converted && (
                                                    <div className="text-[9px] text-gray-500 mt-1 px-1">≈ {sellerConvertedInputs[`variant-${i}-compare`].converted}</div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Qty</label>
                                                    <FieldHelp text="Stock available for this specific variant." />
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold"><span className="material-icons text-[14px]">inventory_2</span></span>
                                                    <input
                                                        type="number"
                                                        value={v.stock}
                                                        onChange={e => {
                                                            const n = [...variants];
                                                            const parsed = parseInt(e.target.value);
                                                            n[i].stock = isNaN(parsed) ? 0 : parsed;
                                                            setVariants(n);
                                                        }}
                                                        className="w-full border-none bg-gray-50 rounded-lg py-2 pl-8 pr-3 text-[11px] font-bold focus:ring-2 focus:ring-orange-500"
                                                        placeholder="Qty"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Pricing & Delivery */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        {/* Pricing */}
                        <div className="space-y-4">
                            {!hasVariants && (
                                <>
                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Currency</h3>
                                                <FieldHelp text="Choose the currency you will enter prices in. We show an approximate USD conversion under your prices." />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Choose your local currency</p>
                                        </div>
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="bg-white border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:border-orange-500 outline-none transition-all"
                                        >
                                            {SUPPORTED_CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing Unit</h3>
                                                <FieldHelp text="This is the sale unit shown to buyers (e.g. per piece, per kg)." />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Sale unit (e.g. per kg, per piece)</p>
                                        </div>
                                        <select
                                            value={pricingUnit}
                                            onChange={e => setPricingUnit(e.target.value)}
                                            className="bg-white border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:border-orange-500 outline-none transition-all"
                                        >
                                            {['piece', 'kg', 'g', 'L', 'ml', 'meter', 'box', 'pack', 'pair', 'dozen'].map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {!hasVariants && (
                                <>
                                    <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing & Inventory</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selling Price *</label>
                                                <FieldHelp text="The price buyers pay per unit. You'll see an approximate USD conversion under the field." />
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-12 pr-16 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase">/ {pricingUnit}</span>
                                            </div>
                                            {currency !== conversionTargetCurrency && sellerConvertedInputs['base-price']?.converted && price && parseFloat(price) > 0 && (
                                                <div className="text-[10px] text-gray-500 px-1 mt-1">≈ {sellerConvertedInputs['base-price'].converted}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Original RRP (for discount)</label>
                                                <FieldHelp text="Optional. If higher than selling price, buyers will see a discount/strikethrough." />
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                                <input type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-12 pr-16 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg text-gray-500" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase">/ {pricingUnit}</span>
                                            </div>
                                            {currency !== conversionTargetCurrency && sellerConvertedInputs['base-compare']?.converted && compareAtPrice && parseFloat(compareAtPrice) > 0 && (
                                                <div className="text-[10px] text-gray-500 px-1 mt-1">≈ {sellerConvertedInputs['base-compare'].converted}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Base Stock</label>
                                            <FieldHelp text="How many units you have available for sale." />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><span className="material-icons text-sm">inventory_2</span></span>
                                            <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full border p-3 pl-12 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Wholesale Tiers */}
                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold uppercase text-gray-900 tracking-wider">Wholesale Tiers</h3>
                                            <FieldHelp text="Optional bulk pricing. Buyers get a lower unit price when they order at least the minimum quantity." />
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Bulk discounts for large orders</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setQuantityDiscounts([...quantityDiscounts, { min_quantity: 0, unit_price: 0 }])}
                                        className="bg-orange-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-transform"
                                    >
                                        <span className="material-icons text-xs">add</span> Add Tier
                                    </button>
                                </div>

                                {quantityDiscounts.length > 0 ? (
                                    <div className="space-y-3">
                                        {quantityDiscounts.map((tier, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-orange-100 shadow-sm animate-in slide-in-from-right-4">
                                                <div className="flex items-end gap-3">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase">Min. Qty</label>
                                                        <input
                                                            type="number"
                                                            value={tier.min_quantity}
                                                            onChange={(e) => {
                                                                const n = [...quantityDiscounts];
                                                                n[idx].min_quantity = parseInt(e.target.value) || 0;
                                                                setQuantityDiscounts(n);
                                                            }}
                                                            placeholder="e.g. 100"
                                                            className="w-full bg-gray-50 border-none rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[9px] font-black text-gray-400 uppercase">Unit Price ({getCurrencySymbol(currency)})</label>
                                                            <FieldHelp text="Unit price a buyer pays when they purchase at least the minimum quantity." />
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={tier.unit_price}
                                                            onChange={(e) => {
                                                                const n = [...quantityDiscounts];
                                                                n[idx].unit_price = parseFloat(e.target.value) || 0;
                                                                setQuantityDiscounts(n);
                                                            }}
                                                            placeholder="0.00"
                                                            className="w-full bg-gray-50 border-none rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 text-orange-600"
                                                        />
                                                        {currency !== conversionTargetCurrency && tier.unit_price > 0 && sellerConvertedInputs[`tier-${idx}`]?.converted && (
                                                            <div className="text-[9px] text-gray-500 mt-1">≈ {sellerConvertedInputs[`tier-${idx}`].converted}</div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuantityDiscounts(quantityDiscounts.filter((_, i) => i !== idx))}
                                                        className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-icons text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                        <span className="material-icons text-gray-200 text-3xl mb-1">loyalty</span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No bulk pricing tiers yet</p>
                                    </div>
                                )}
                            </div>
                            {/* Promotions Info Note */}
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mt-2">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <span className="material-icons text-blue-500 text-sm">info</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">Want to add a promotion?</p>
                                        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed opacity-80">
                                            Create coupons and campaigns in the <strong>Promotions</strong> dashboard after publishing. This gives you better control over periods, quantities, and tracking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="space-y-3 pt-6 border-t">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Delivery</h3>
                            <div className="space-y-3 mt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Delivery Scope</label>
                                    <FieldHelp text="Where you can deliver: nationwide, selected regions, or specific cities/radius." />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {DELIVERY_SCOPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setDeliveryScope(opt.value);
                                                if (opt.value === 'nationwide') setDeliveryLocations([]);
                                            }}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                                                deliveryScope === opt.value
                                                    ? "border-orange-500 bg-orange-50/50 shadow-sm"
                                                    : "border-gray-100 bg-white hover:border-gray-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                    deliveryScope === opt.value ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    <span className="material-icons text-xl">
                                                        {opt.value === 'nationwide' ? 'public' : opt.value === 'regional' ? 'map' : 'location_on'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className={cn("font-bold text-sm", deliveryScope === opt.value ? "text-orange-900" : "text-gray-900")}>{opt.label}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase font-medium">{opt.detail}</div>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                deliveryScope === opt.value ? "border-orange-500" : "border-gray-300"
                                            )}>
                                                {deliveryScope === opt.value && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {deliveryScope !== 'nationwide' && (
                                    <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                {deliveryScope === 'regional' ? 'Target Regions' : 'Specific Locations / Radius'}
                                            </label>
                                            <FieldHelp
                                                text={deliveryScope === 'regional'
                                                    ? 'Pick the regions/states you can deliver to.'
                                                    : 'Add cities or delivery radius (e.g. Kilimani, 10km).'
                                                }
                                            />
                                        </div>

                                        {deliveryScope === 'regional' ? (
                                            /* Modern searchable region multi-select for regional scope */
                                            <MobileRegionMultiSelect
                                                selectedRegions={deliveryLocations}
                                                onChange={setDeliveryLocations}
                                                placeholder="Tap to select target regions..."
                                            />
                                        ) : (
                                            /* Original text input for local scope */
                                            <>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={deliveryLocationInput}
                                                        onChange={e => setDeliveryLocationInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (deliveryLocationInput.trim()) {
                                                                    setDeliveryLocations(prev => [...new Set([...prev, deliveryLocationInput.trim()])]);
                                                                    setDeliveryLocationInput('');
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Add city or radius (e.g. Kilimani, 10km)"
                                                        className="flex-1 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none outline-none text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (deliveryLocationInput.trim()) {
                                                                setDeliveryLocations(prev => [...new Set([...prev, deliveryLocationInput.trim()])]);
                                                                setDeliveryLocationInput('');
                                                            }
                                                        }}
                                                        className="bg-orange-500 text-white p-3 rounded-xl flex items-center justify-center"
                                                    >
                                                        <span className="material-icons text-sm">add</span>
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {deliveryLocations.map(loc => (
                                                        <div key={loc} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm border border-orange-200">
                                                            {loc}
                                                            <span className="material-icons text-[14px] cursor-pointer hover:text-red-500" onClick={() => setDeliveryLocations(prev => prev.filter(l => l !== loc))}>cancel</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", freeDelivery ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500")}>
                                        <span className="material-icons text-xl">{freeDelivery ? 'redeem' : 'local_shipping'}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-sm">Free Delivery?</div>
                                            <FieldHelp text="When enabled, buyers can get free shipping (typically above your free-delivery threshold)." />
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase font-medium">Toggle free shipping for customers</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setFreeDelivery(!freeDelivery)}
                                    className={cn("w-12 h-6 rounded-full p-1 transition-colors cursor-pointer", freeDelivery ? "bg-green-500" : "bg-gray-300")}
                                >
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", freeDelivery ? "translate-x-6" : "")} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isChoice ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-400 shadow-inner")}>
                                        <span className="material-icons text-xl">star</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-indigo-900">Choice Product?</div>
                                        <div className="text-[10px] text-indigo-500 uppercase font-medium">Premium selection badge & visibility</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setIsChoice(!isChoice)}
                                    className={cn("w-12 h-6 rounded-full p-1 transition-colors cursor-pointer", isChoice ? "bg-indigo-500" : "bg-gray-300")}
                                >
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isChoice ? "translate-x-6" : "")} />
                                </div>
                            </div>

                            {!freeDelivery && (
                                <div className="space-y-1 mt-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Delivery Cost</label>
                                        <FieldHelp text="Shipping fee the buyer pays (if free delivery is off)." />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            )}

                            {/* Credit for Delay */}
                            <div className="space-y-1 mt-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Credit for Delay</label>
                                    <FieldHelp text="Optional credit offered if delivery is delayed." />
                                </div>
                                <p className="text-[9px] text-gray-400 px-1 mb-1">Credit amount offered if delivery is delayed</p>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                    <input
                                        type="number"
                                        value={delayCredit}
                                        onChange={e => setDelayCredit(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Time Estimate</label>
                                        <FieldHelp text="A quick label shown to buyers (e.g. 3–5 days)." />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold z-10"><span className="material-icons text-sm">schedule</span></span>
                                        <select
                                            value={deliveryTime}
                                            onChange={e => setDeliveryTime(e.target.value)}
                                            className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none outline-none text-sm appearance-none"
                                        >
                                            <option value="">Select Est.</option>
                                            <option value="1-2 days">1-2 Days</option>
                                            <option value="3-5 days">3-5 Days</option>
                                            <option value="7-10 days">7-10 Days</option>
                                            <option value="2 weeks+">2 Weeks+</option>
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-icons text-gray-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Delivery Time (Days)</label>
                                        <FieldHelp text="Numeric delivery days used for sorting/estimation." />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><span className="material-icons text-sm">event</span></span>
                                        <input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={deliveryTimeDaysInput}
                                            onChange={e => setDeliveryTimeDaysInput(e.target.value)}
                                            placeholder="1"
                                            className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isExpressDelivery ? "bg-orange-100 text-orange-600" : "bg-gray-200 text-gray-500")}>
                                        <span className="material-icons text-xl">bolt</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-sm">Express Delivery?</div>
                                            <FieldHelp text="Marks this listing as able to ship faster than standard." />
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase font-medium">Flag orders that can ship faster</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setIsExpressDelivery(!isExpressDelivery)}
                                    className={cn("w-12 h-6 rounded-full p-1 transition-colors cursor-pointer", isExpressDelivery ? "bg-orange-500" : "bg-gray-300")}
                                >
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isExpressDelivery ? "translate-x-6" : "")} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min Order Value</label>
                                        <FieldHelp text="Optional. Prevents checkout below this cart amount." />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min Order for Free Del.</label>
                                        <FieldHelp text="Free delivery threshold. If Free Delivery is enabled, orders at/above this amount get free shipping." />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={minOrderForFreeDelivery} onChange={e => setMinOrderForFreeDelivery(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Step 4: Media */}
                {currentStep === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl text-center space-y-3">
                            <span className="material-icons text-orange-500 text-3xl">add_a_photo</span>
                            <div className="font-bold">Add Photos</div>
                            <div className="flex flex-col gap-2">
                                <label className="block w-full">
                                    <span className="bg-orange-500 text-white font-bold py-2.5 px-6 rounded-full shadow-md inline-block w-full">
                                        Take Photo
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                </label>

                                <label className="block w-full">
                                    <span className="bg-white text-orange-600 font-bold py-2.5 px-6 rounded-full shadow-sm inline-block w-full border border-orange-200">
                                        Select Images
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* YouTube */}
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    value={youtubeInput}
                                    onChange={e => setYoutubeInput(e.target.value)}
                                    placeholder="Paste YouTube Link"
                                    className="flex-1 border p-3 rounded-lg text-sm"
                                />
                                <button
                                    onClick={() => {
                                        if (youtubeInput.includes('youtube') || youtubeInput.includes('youtu.be')) {
                                            setYoutubeUrls(prev => [...prev, youtubeInput]);
                                            setYoutubeInput('');
                                        } else alert('Invalid URL');
                                    }}
                                    className="bg-red-600 text-white p-3 rounded-lg"
                                >
                                    <span className="material-icons">play_arrow</span>
                                </button>
                            </div>
                            {youtubeUrls.map(url => (
                                <div key={url} className="text-xs text-blue-600 truncate bg-blue-50 p-2 rounded flex justify-between">
                                    {url} <button onClick={() => setYoutubeUrls(prev => prev.filter(u => u !== url))}>×</button>
                                </div>
                            ))}
                        </div>

                        {/* Gallery */}
                        <div className="grid grid-cols-3 gap-2">
                            {uploadedMedia.map((media, idx) => (
                                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                    <img src={media.url} className="w-full h-full object-cover" />
                                    {media.is_main && <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] px-1.5 rounded">MAIN</div>}
                                    <button onClick={() => setUploadedMedia(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: SEO */}
                {currentStep === 5 && (
                    <div className="pt-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold uppercase text-gray-500">SEO & Visibility</h3>
                            <button
                                onClick={handleGenerateSEO}
                                disabled={isGeneratingSEO || !title.trim()}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                            >
                                <span className={`material-icons text-[12px] ${isGeneratingSEO ? 'animate-spin' : ''}`}>
                                    {isGeneratingSEO ? 'sync' : 'auto_awesome'}
                                </span>
                                {isGeneratingSEO ? 'GENERATING...' : 'AI GENERATE SEO'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">SEO Title</label>
                                <input
                                    value={seoTitle}
                                    onChange={e => setSeoTitle(e.target.value)}
                                    placeholder={title || "Best Running Shoes..."}
                                    className="w-full border p-3 rounded-lg text-sm bg-gray-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Description</label>
                                <textarea
                                    value={metaDescriptionState}
                                    onChange={e => setMetaDescriptionState(e.target.value)}
                                    placeholder="Max 160 characters..."
                                    className="w-full border p-3 rounded-lg text-sm bg-gray-50 h-20"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">URL Slug</label>
                                <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                                    <span className="text-gray-400 text-xs mr-1">/product/</span>
                                    <input
                                        value={urlSlug}
                                        onChange={e => setUrlSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        placeholder="product-name"
                                        className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Discovery Tags Section */}
                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Discovery Tags</h3>

                            {/* Magic Tags */}
                            <div className="space-y-1 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Tags</label>
                                    <button
                                        onClick={handleGenerateTags}
                                        disabled={isGeneratingTags || !title.trim()}
                                        className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
                                    >
                                        <span className={`material-icons text-[12px] ${isGeneratingTags ? 'animate-spin' : ''}`}>
                                            {isGeneratingTags ? 'sync' : 'auto_awesome'}
                                        </span>
                                        {isGeneratingTags ? 'GENERATING...' : 'AI GENERATE'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(t => (
                                        <span key={t} className="bg-gray-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {t} <button onClick={() => setTags(prev => prev.filter(x => x !== t))}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (tagInput.trim()) { setTags(prev => [...prev, tagInput.trim()]); setTagInput(''); }
                                        }
                                    }}
                                    placeholder="Add keyword + Enter"
                                    className="w-full border p-3 rounded-lg text-sm"
                                />
                            </div>

                            {/* Use Case Tags */}
                            <div className="space-y-1 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Use Case Tags</label>
                                    <button
                                        onClick={handleGenerateUseCaseTags}
                                        disabled={isGeneratingUseCaseTags || !title.trim()}
                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                                    >
                                        <span className={`material-icons text-[12px] ${isGeneratingUseCaseTags ? 'animate-spin' : ''}`}>
                                            {isGeneratingUseCaseTags ? 'sync' : 'auto_awesome'}
                                        </span>
                                        {isGeneratingUseCaseTags ? 'GENERATING...' : 'AI SUGGEST'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-1">e.g. Office, Hiking</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {useCaseTags.map(t => (
                                        <span key={t} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {t} <button onClick={() => setUseCaseTags(prev => prev.filter(x => x !== t))}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    value={useCaseInput}
                                    onChange={e => setUseCaseInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (useCaseInput.trim()) { setUseCaseTags(prev => [...prev, useCaseInput.trim()]); setUseCaseInput(''); }
                                        }
                                    }}
                                    placeholder="Add use case + Enter"
                                    className="w-full border p-3 rounded-lg text-sm"
                                />
                            </div>

                            {/* Occasion Tags */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Occasion Tags</label>
                                    <button
                                        onClick={handleGenerateOccasionTags}
                                        disabled={isGeneratingOccasionTags || !title.trim()}
                                        className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full"
                                    >
                                        <span className={`material-icons text-[12px] ${isGeneratingOccasionTags ? 'animate-spin' : ''}`}>
                                            {isGeneratingOccasionTags ? 'sync' : 'auto_awesome'}
                                        </span>
                                        {isGeneratingOccasionTags ? 'GENERATING...' : 'AI SUGGEST'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-1">e.g. Wedding, Birthday</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {occasionTags.map(t => (
                                        <span key={t} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {t} <button onClick={() => setOccasionTags(prev => prev.filter(x => x !== t))}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    value={occasionInput}
                                    onChange={e => setOccasionInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (occasionInput.trim()) { setOccasionTags(prev => [...prev, occasionInput.trim()]); setOccasionInput(''); }
                                        }
                                    }}
                                    placeholder="Add occasion + Enter"
                                    className="w-full border p-3 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar - Outside Scroll View */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-10 safe-area-bottom">
                <div className="flex gap-3">
                    {currentStep > 0 && (
                        <button onClick={handleBack} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-gray-200 transition">Back</button>
                    )}
                    {currentStep < STEPS.length - 1 ? (
                        <button onClick={handleNext} className="flex-[2] py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition">Next</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-200 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? 'Publishing...' : 'Publish Product'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
