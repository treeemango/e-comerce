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

const STEPS = ['Basics', 'Attributes', 'Variants', 'Pricing', 'Media'];

const DELIVERY_SCOPE_OPTIONS = [
    { value: 'nationwide', label: 'Nationwide' },
    { value: 'regional', label: 'Regional' },
    { value: 'local', label: 'Local' }
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
    const [promoCode, setPromoCode] = useState('');

    // Step 4: Media & SEO
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploadedMedia, setUploadedMedia] = useState<MediaUploadData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [youtubeInput, setYoutubeInput] = useState('');
    const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);

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
                currency: 'USD',
                price: numPrice,
                variants: finalVariants,
                media: uploadedMedia.map((m, i) => ({ ...m, position: i })),
                attributes,
                tags: tags,
                seo_title: title,
                meta_description: description,
                url_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                delivery_scope: deliveryScope,
                delivery_cost: parseFloat(deliveryCost) || 0,
                delivery_time_estimate: deliveryTime,
                free_delivery: freeDelivery,
                min_order_value: 0,
                promo_code: promoCode || undefined
            };

            const pid = await createProductFull(sellerId, payload, finalVariants, payload.media, attributes);
            if (pid) { alert("Published!"); onSuccess(); } else { throw new Error("Failed"); }
        } catch (e) { console.error(e); alert("Failed to publish."); }
        finally { setIsSubmitting(false); }
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
                            <label className="text-xs font-bold uppercase text-gray-500">Details</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product Title" className="w-full border p-3 rounded-lg" />
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." className="w-full border p-3 rounded-lg h-24" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Tags</label>
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
                                placeholder="Add tag + Enter"
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
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Pricing & Inventory</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800">Base Price *</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 rounded-lg" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800">Original Price</label>
                                    <input type="number" value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" className="w-full border p-3 rounded-lg" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-800">Base Stock</label>
                                <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full border p-3 rounded-lg" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-800">Promo Code (Optional)</label>
                                <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="e.g. SUMMER20" className="w-full border p-3 rounded-lg" />
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="space-y-3 pt-6 border-t">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Delivery</h3>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-800">Scope</label>
                                <select value={deliveryScope} onChange={e => setDeliveryScope(e.target.value)} className="w-full border p-3 rounded-lg bg-white">
                                    {DELIVERY_SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="font-bold text-sm">Free Delivery?</span>
                                <input type="checkbox" checked={freeDelivery} onChange={e => setFreeDelivery(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                            </div>

                            {!freeDelivery && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800">Delivery Cost</label>
                                    <input type="number" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} placeholder="0.00" className="w-full border p-3 rounded-lg" />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-800">Time Estimate</label>
                                <input type="text" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="e.g. 3-5 days" className="w-full border p-3 rounded-lg" />
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
