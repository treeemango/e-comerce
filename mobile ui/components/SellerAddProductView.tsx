import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../lib/currency';
import {
    ShopifyVertical,
    ShopifyCategory,
    ShopifyBrand,
    ShopifyAttribute,
    MediaUploadData,
    ProductAttributeData,
    ProductVariantData
} from '../../types';
import { SearchableSelect } from './SearchableSelect';

interface SellerAddProductViewProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const STEPS = ['Basics', 'Attributes', 'Variants', 'Pricing', 'Media', 'SEO'];

const DELIVERY_SCOPE_OPTIONS = [
    { value: 'nationwide', label: 'Nationwide', detail: 'Across the whole country' },
    { value: 'regional', label: 'Regional', detail: 'Selected regions or states' },
    { value: 'local', label: 'Local', detail: 'Within one city or radius' }
];

export const SellerAddProductView: React.FC<SellerAddProductViewProps> = ({
    sellerId,
    onClose,
    onSuccess,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    const [deliveryTimeDays, setDeliveryTimeDays] = useState(1);
    const [isExpressDelivery, setIsExpressDelivery] = useState(false);
    const [freeDelivery, setFreeDelivery] = useState(false);
    const [minOrderValue, setMinOrderValue] = useState('0');
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState('0');
    const [currency, setCurrency] = useState('USD');
    const [pricingUnit, setPricingUnit] = useState('piece');
    const [deliveryLocations, setDeliveryLocations] = useState<string[]>([]);
    const [deliveryLocationInput, setDeliveryLocationInput] = useState('');
    const [isChoice, setIsChoice] = useState(false);


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
        const baseP = parseFloat(price) || 0;
        const baseS = parseInt(stock) || 0;

        // Create variants, preserving existing data if matching options found
        const newVariants = combos.map(combo => {
            const existing = variants.find(v => JSON.stringify(v.options) === JSON.stringify(combo));
            return {
                sku: existing?.sku || `${title.substring(0, 3).toUpperCase()}-${Object.values(combo).join('-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
                price: existing?.price || baseP,
                compare_at_price: existing?.compare_at_price || parseFloat(compareAtPrice) || undefined,
                original_price: existing?.original_price || parseFloat(compareAtPrice) || undefined, // legacy
                stock: typeof existing?.stock === 'number' ? existing.stock : baseS,
                options: combo,
                is_default: false,
                image_url: existing?.image_url
            };
        });
        setVariants(newVariants);
    }, [variantOptions, hasVariants, title]); // Don't depend on price/stock changes to avoid overwriting custom variant edits

    // --- AI Handlers ---
    const handleImproveTitle = async () => {
        if (!title.trim()) return;
        setIsImprovingTitle(true);
        try {
            const cat = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.improveTitle(title, cat);
            if (res) setTitle(res);
        } finally {
            setIsImprovingTitle(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!title.trim()) return;
        setIsGeneratingDescription(true);
        try {
            const cat = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateDescription(title, cat, attributes);
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
        if (currentStep === 0) {
            if (!title || !categoryId) { alert("Title and Category are required."); return; }
        } else if (currentStep === 3) {
            if (!price) { alert("Base Price is required."); return; }
        }
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
        if (!categoryId || !title || !price) {
            alert('Please fill in all required fields (Title, Category, Price).');
            return;
        }

        setIsSubmitting(true);
        try {
            const numPrice = parseFloat(price);
            const numCompare = compareAtPrice ? parseFloat(compareAtPrice) : undefined;
            const numStock = parseInt(stock) || 0;

            // Merge uploaded media with YouTube URLs (matching web logic)
            const youtubeMedia = youtubeUrls.map((url, idx) => ({
                url,
                storage_path: '',
                media_type: 'youtube',
                is_main: false,
                position: uploadedMedia.length + idx,
                alt_text: title
            }));

            const allMedia = [...uploadedMedia, ...youtubeMedia];

            const joinedSeoKeywords = seoKeywords.map(k => k.trim()).filter(Boolean).join(', ');

            const preparedVariants = (hasVariants ? variants : [{
                sku: `${title.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
                price: numPrice,
                compare_at_price: numCompare,
                original_price: numCompare,
                stock: numStock,
                options: {},
                is_default: true
            }]).map(v => {
                const rrp = (typeof v.compare_at_price === 'number' && v.compare_at_price > v.price)
                    ? v.compare_at_price
                    : v.price;
                const discountPercent = (rrp > v.price)
                    ? Math.round(((rrp - v.price) / rrp) * 100)
                    : 0;

                return {
                    ...v,
                    compare_at_price: v.compare_at_price || rrp, // Ensure it's never NULL for RPC if we want strike-through parity
                    original_price: v.compare_at_price || rrp,
                    rrp,
                    discount_percent: discountPercent
                };
            });

            // Dynamically look up Pricing Unit attribute UUID to avoid syntax errors
            const pricingUnitAttr = availableAttributes.find(a => a.name.toLowerCase().includes('unit'));
            const finalAttributes = [...attributes];

            if (pricingUnitAttr) {
                // Only add if we have a valid UUID-based attribute from the category
                const existingIdx = finalAttributes.findIndex(a => a.attribute_id === pricingUnitAttr.id);
                const attrObj = {
                    attribute_id: pricingUnitAttr.id,
                    name: pricingUnitAttr.name,
                    value: pricingUnit,
                    is_custom: false
                };
                if (existingIdx > -1) {
                    finalAttributes[existingIdx] = attrObj;
                } else {
                    finalAttributes.push(attrObj);
                }
            }

            // Append detailed delivery locations to time estimate for visibility
            const fullDeliveryTime = deliveryLocations.length > 0
                ? `${deliveryTime} (${deliveryLocations.join(', ')})`
                : deliveryTime;

            const payload = {
                title,
                description,
                category_id: categoryId,
                brand_id: brandId || undefined,
                currency: currency,
                variants: preparedVariants,
                media: allMedia.map((m, i) => ({ ...m, position: i })),
                tags: tags,
                use_case_tags: useCaseTags,
                occasion_tags: occasionTags,
                attributes: finalAttributes,
                seo_title: seoTitle || title,
                meta_description: metaDescriptionState || description,
                url_slug: urlSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                canonical_url: canonicalUrl || undefined,
                seo_keywords: joinedSeoKeywords || undefined,
                delivery_scope: deliveryScope,
                delivery_cost: parseFloat(deliveryCost) || 0,
                delivery_time_estimate: fullDeliveryTime,
                delivery_time_days: Number.isFinite(deliveryTimeDays) ? deliveryTimeDays : 1,
                is_express_delivery: isExpressDelivery,
                free_delivery: freeDelivery,
                min_order_value: parseFloat(minOrderValue) || 0,
                min_order_for_free_delivery: parseFloat(minOrderForFreeDelivery) || 0,
                is_choice: isChoice,
                delivery_locations: deliveryLocations,
                sale_unit: pricingUnit,
                is_active: true
            };

            const pid = await createProductFull(sellerId, payload, preparedVariants, payload.media, finalAttributes);
            if (pid) {
                alert("Published! Your product is now pending approval.");
                onSuccess();
            } else {
                throw new Error("Failed to create product.");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to publish product.");
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
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product Title" className="w-full border p-3 rounded-lg" />
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
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." className="w-full border p-3 rounded-lg h-24" />
                        </div>

                        <div className="space-y-1">
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
                                    {isGeneratingTags ? 'GENERATING...' : 'AI GENERATE TAGS'}
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

                        <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Use Case (e.g. Hiking, Office)</label>
                                <button
                                    onClick={handleGenerateUseCaseTags}
                                    disabled={isGeneratingUseCaseTags || !title.trim()}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                                >
                                    <span className={`material-icons text-[12px] ${isGeneratingUseCaseTags ? 'animate-spin' : ''}`}>
                                        {isGeneratingUseCaseTags ? 'sync' : 'auto_awesome'}
                                    </span>
                                    {isGeneratingUseCaseTags ? 'GENERATING...' : 'AI GENERATE'}
                                </button>
                            </div>
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

                        <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Occasion (e.g. Wedding, Summer)</label>
                                <button
                                    onClick={handleGenerateOccasionTags}
                                    disabled={isGeneratingOccasionTags || !title.trim()}
                                    className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full"
                                >
                                    <span className={`material-icons text-[12px] ${isGeneratingOccasionTags ? 'animate-spin' : ''}`}>
                                        {isGeneratingOccasionTags ? 'sync' : 'auto_awesome'}
                                    </span>
                                    {isGeneratingOccasionTags ? 'GENERATING...' : 'AI GENERATE'}
                                </button>
                            </div>
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

                {/* Step 2: Variants */}
                {currentStep === 2 && (
                    <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <span className="font-bold text-gray-900">This product has variants?</span>
                            <div
                                onClick={() => setHasVariants(!hasVariants)}
                                className={cn("w-12 h-6 rounded-full p-1 transition-colors cursor-pointer", hasVariants ? "bg-orange-500" : "bg-gray-300")}
                            >
                                <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", hasVariants ? "translate-x-6" : "")} />
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

                        {hasVariants && (
                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing Unit & Currency</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col justify-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Currency</label>
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
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</label>
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
                                                <div className="font-bold text-gray-900 mb-1">{Object.values(v.options).join(' / ')}</div>
                                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{v.sku}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-50">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</label>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{getCurrencySymbol(currency)}</span>
                                                    <input
                                                        type="number"
                                                        value={v.price}
                                                        onChange={e => {
                                                            const n = [...variants]; n[i].price = parseFloat(e.target.value); setVariants(n);
                                                        }}
                                                        className="w-full border-none bg-gray-50 rounded-lg py-2 pl-8 pr-3 text-[11px] font-bold focus:ring-2 focus:ring-orange-500"
                                                        placeholder="Price"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Original Price</label>
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
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Stock Qty</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold"><span className="material-icons text-[14px]">inventory_2</span></span>
                                                    <input
                                                        type="number"
                                                        value={v.stock}
                                                        onChange={e => {
                                                            const n = [...variants]; n[i].stock = parseInt(e.target.value) || 0; setVariants(n);
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
                                            <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Currency</h3>
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
                                            <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing Unit</h3>
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

                            <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing & Inventory</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Base Price *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-12 pr-16 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase">/ {pricingUnit}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Original Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-12 pr-16 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg text-gray-500" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase">/ {pricingUnit}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Base Stock</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><span className="material-icons text-sm">inventory_2</span></span>
                                    <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full border p-3 pl-12 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold" />
                                </div>
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
                                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Delivery Scope</label>
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
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                                            {deliveryScope === 'regional' ? 'Target Regions' : 'Specific Locations / Radius'}
                                        </label>
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
                                                placeholder={deliveryScope === 'regional' ? "Add region (e.g. Rift Valley, Coast)" : "Add city or radius (e.g. Kilimani, 10km)"}
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
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", freeDelivery ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500")}>
                                        <span className="material-icons text-xl">{freeDelivery ? 'redeem' : 'local_shipping'}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Free Delivery?</div>
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
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Delivery Cost</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Time Estimate</label>
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
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Delivery Time (Days)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><span className="material-icons text-sm">event</span></span>
                                        <input type="number" value={deliveryTimeDays} onChange={e => setDeliveryTimeDays(parseInt(e.target.value) || 1)} placeholder="1" className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isExpressDelivery ? "bg-orange-100 text-orange-600" : "bg-gray-200 text-gray-500")}>
                                        <span className="material-icons text-xl">bolt</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Express Delivery?</div>
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
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Min Order Value</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{getCurrencySymbol(currency)}</span>
                                        <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Min Order for Free Del.</label>
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
                            <label className="block w-full">
                                <span className="bg-orange-500 text-white font-bold py-2.5 px-6 rounded-full shadow-md inline-block">Select Images</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                            </label>
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
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Canonical URL (Optional)</label>
                                <input
                                    value={canonicalUrl}
                                    onChange={e => setCanonicalUrl(e.target.value)}
                                    placeholder="https://example.com/product"
                                    className="w-full border p-3 rounded-lg text-sm bg-gray-50"
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
