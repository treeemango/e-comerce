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
import { SUPPORTED_CURRENCIES } from '../../lib/currency';
import {
    ShopifyVertical,
    ShopifyCategory,
    ShopifyBrand,
    ShopifyAttribute,
    MediaUploadData,
    ProductAttributeData,
    ProductVariantData
} from '../../types';

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
    const [freeDelivery, setFreeDelivery] = useState(false);
    const [minOrderValue, setMinOrderValue] = useState('0');
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState('0');
    const [currency, setCurrency] = useState('USD');


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

    // --- Effects ---

    // 1. Initial Load (Verticals)
    useEffect(() => {
        const loadVerticals = async () => {
            setIsLoadingVerticals(true);
            try {
                const data = await fetchVerticals();
                setVerticals(data);
            } finally {
                setIsLoadingVerticals(false);
            }
        };
        loadVerticals();
    }, []);

    // 2. Fetch Categories when Vertical Changes
    useEffect(() => {
        if (selectedVertical) {
            fetchCategories(selectedVertical).then(setCategories);
            setCategoryId('');
            setBrands([]);
            setAvailableAttributes([]);
            setAttributes([]);
        } else {
            setCategories([]);
        }
    }, [selectedVertical]);

    // 3. Fetch Brands & Attributes when Category Changes
    useEffect(() => {
        if (categoryId) {
            fetchBrands(categoryId).then(setBrands);
            fetchAttributes(categoryId).then((attrs) => {
                setAvailableAttributes(attrs);
                setAttributeOptionsMap({});
            });
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
                compare_at_price: existing?.compare_at_price,
                original_price: existing?.original_price, // legacy
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
    const addVariantOption = (name: string) => {
        if (variantOptions.some(o => o.name.toLowerCase() === name.toLowerCase())) return;
        setVariantOptions(prev => [...prev, { id: Date.now().toString(), name, values: [] }]);
    };

    const addVariantValue = (optionIndex: number, value: string) => {
        const option = variantOptions[optionIndex];
        if (option.values.includes(value)) return;
        const newOpts = [...variantOptions];
        newOpts[optionIndex] = { ...option, values: [...option.values, value] };
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const numPrice = parseFloat(price);
            const numCompare = compareAtPrice ? parseFloat(compareAtPrice) : undefined;
            const numStock = parseInt(stock) || 0;

            const finalVariants = hasVariants ? variants : [{
                sku: `${title.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                price: numPrice,
                compare_at_price: numCompare ?? numPrice,
                original_price: numCompare ?? numPrice,
                stock: numStock,
                options: {},
                is_default: true,
                rrp: numCompare ?? numPrice,
                discount_percent: numCompare && numPrice ? Math.max(0, Math.round(((numCompare - numPrice) / numCompare) * 100)) : 0
            }];
            const payload = {
                title,
                description,
                category_id: categoryId,
                brand_id: brandId || undefined,
                currency: currency,
                price: numPrice,
                variants: finalVariants,
                media: uploadedMedia.map((m, i) => ({ ...m, position: i })),
                attributes,
                tags: [...tags, ...seoKeywords],
                use_case_tags: useCaseTags,
                occasion_tags: occasionTags,
                seo_title: seoTitle || title,
                meta_description: metaDescriptionState || description,
                url_slug: urlSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                delivery_scope: deliveryScope,
                delivery_cost: parseFloat(deliveryCost) || 0,
                delivery_time_estimate: deliveryTime,
                free_delivery: freeDelivery,
                min_order_value: parseFloat(minOrderValue) || 0,
                min_order_for_free_delivery: parseFloat(minOrderForFreeDelivery) || 0,
                is_active: true
            };

            const pid = await createProductFull(sellerId, payload, finalVariants, payload.media, attributes);
            if (pid) {
                alert("Published!");
                onSuccess();
            } else {
                throw new Error("Failed");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to publish.");
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
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Classification</label>
                            <select value={selectedVertical} onChange={e => setSelectedVertical(e.target.value)} className="w-full border p-3 rounded-lg bg-gray-50 mb-2">
                                <option value="">Select Vertical...</option>
                                {verticals.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!selectedVertical} className="w-full border p-3 rounded-lg bg-gray-50 disabled:opacity-50 mb-2">
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={brandId} onChange={e => setBrandId(e.target.value)} disabled={!categoryId} className="w-full border p-3 rounded-lg bg-gray-50 disabled:opacity-50">
                                <option value="">Select Brand (Optional)...</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
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
                        {availableAttributes.length === 0 ? (
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
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase text-gray-500">Options (e.g. Color, Size)</h3>
                                    {variantOptions.map((opt, idx) => (
                                        <div key={opt.id} className="p-3 border rounded-lg bg-white">
                                            <div className="flex justify-between font-bold mb-2">{opt.name}</div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {opt.values.map(val => (
                                                    <span key={val} className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">{val}</span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={optionValueInputs[opt.id] || ''}
                                                    onChange={e => setOptionValueInputs(prev => ({ ...prev, [opt.id]: e.target.value }))}
                                                    placeholder="Add value..."
                                                    className="flex-1 border p-2 rounded text-sm"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const val = (optionValueInputs[opt.id] || '').trim();
                                                        if (val) { addVariantValue(idx, val); setOptionValueInputs(prev => ({ ...prev, [opt.id]: '' })); }
                                                    }}
                                                    className="bg-gray-900 text-white px-3 rounded font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <button onClick={() => addVariantOption('Color')} className="px-3 py-1 bg-gray-200 rounded text-xs font-bold">+ Color</button>
                                        <button onClick={() => addVariantOption('Size')} className="px-3 py-1 bg-gray-200 rounded text-xs font-bold">+ Size</button>
                                        <button onClick={() => addVariantOption('Material')} className="px-3 py-1 bg-gray-200 rounded text-xs font-bold">+ Material</button>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <h3 className="text-sm font-bold uppercase text-gray-500">Preview Variants ({variants.length})</h3>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {variants.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 border rounded bg-white text-sm">
                                                <span className="font-medium text-gray-700">{Object.values(v.options).join(' / ')}</span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={v.price}
                                                        onChange={e => {
                                                            const n = [...variants]; n[i].price = parseFloat(e.target.value); setVariants(n);
                                                        }}
                                                        className="w-20 border rounded px-1 py-0.5"
                                                        placeholder="Price"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={v.stock}
                                                        onChange={e => {
                                                            const n = [...variants]; n[i].stock = parseFloat(e.target.value); setVariants(n);
                                                        }}
                                                        className="w-16 border rounded px-1 py-0.5"
                                                        placeholder="Qty"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Pricing & Delivery */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        {/* Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wider">Pricing & Inventory</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Base Price *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || '$'}</span>
                                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Original Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || '$'}</span>
                                        <input type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none font-bold text-lg text-gray-500" />
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
                                            onClick={() => setDeliveryScope(opt.value)}
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

                            {!freeDelivery && (
                                <div className="space-y-1 mt-4">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Delivery Cost</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || '$'}</span>
                                        <input type="number" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 mt-4">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Time Estimate</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><span className="material-icons text-sm">schedule</span></span>
                                    <input type="text" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="e.g. 3-5 days" className="w-full border p-3 pl-10 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Min Order Value</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || '$'}</span>
                                        <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Min Order for Free Del.</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">{SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag || '$'}</span>
                                        <input type="number" value={minOrderForFreeDelivery} onChange={e => setMinOrderForFreeDelivery(e.target.value)} placeholder="0.00" className="w-full border p-3 pl-8 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 border-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mt-6">
                                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Currency Selection</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="relative">
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full border p-4 pl-12 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 appearance-none border-none font-bold"
                                        >
                                            {SUPPORTED_CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                                            {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag}
                                        </span>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-icons text-gray-400 pointer-events-none">expand_more</span>
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
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
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
