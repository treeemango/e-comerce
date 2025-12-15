
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CreateProductPayload, ProductAttributeData, ProductVariantData, MediaUploadData, ShopifyVertical, ShopifyCategory, ShopifyBrand, ShopifyAttribute } from '../../../types';
import { createProductFull, fetchVerticals, fetchCategories, fetchBrands, fetchAttributes, fetchAttributeOptions } from '../../../lib/api';
import { MediaService } from '../../../lib/media';
import { getCurrencySymbol } from '../../../lib/currency';

// --- Searchable Select Component ---
interface SearchableSelectProps {
    label: string;
    options: { id: string; name: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, options, value, onChange, placeholder = 'Select...', disabled = false, loading = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isDisabled = disabled || loading;

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div
                className={`relative w-full border rounded-lg bg-white cursor-pointer ${isDisabled ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-orange-500'}`}
                onClick={() => {
                    if (!isDisabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100);
                    }
                }}
            >
                <div className="flex items-center justify-between px-4 py-2.5">
                    <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
                        {selectedOption ? selectedOption.name : (loading ? 'Loading...' : placeholder)}
                    </span>
                    <span className={`material-icons text-gray-400 text-sm ${loading ? 'animate-spin' : ''}`}>
                        {loading ? 'autorenew' : 'expand_more'}
                    </span>
                </div>
            </div>

            {isOpen && !isDisabled && (
                <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                        <div className="flex items-center bg-white border border-gray-200 rounded px-2">
                            <span className="material-icons text-gray-400 text-sm">search</span>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full px-2 py-1.5 outline-none text-sm placeholder-gray-400"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <li
                                    key={opt.id}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 hover:text-orange-900 ${opt.id === value ? 'bg-orange-50 text-orange-900 font-medium' : 'text-gray-700'}`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {opt.name}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};


interface AddProductViewProps {
    sellerId: string;
    onCancel: () => void;
    onSuccess: () => void;
}

const steps = ['Basic Info', 'Media', 'Attributes', 'Variants', 'Review'];

const SUPPORTED_CURRENCIES = [
    { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
    { code: 'DZD', flag: '🇩🇿', name: 'Algerian Dinar' },
    { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound' },
    { code: 'LYD', flag: '🇱🇾', name: 'Libyan Dinar' },
    { code: 'MAD', flag: '🇲🇦', name: 'Moroccan Dirham' },
    { code: 'SDG', flag: '🇸🇩', name: 'Sudanese Pound' },
    { code: 'SSP', flag: '🇸🇸', name: 'South Sudanese Pound' },
    { code: 'TND', flag: '🇹🇳', name: 'Tunisian Dinar' },
    { code: 'MRU', flag: '🇲🇷', name: 'Mauritanian Ouguiya' },
    { code: 'XOF', flag: '🌍', name: 'West African CFA Franc' },
    { code: 'GMD', flag: '🇬🇲', name: 'Gambian Dalasi' },
    { code: 'GHS', flag: '🇬🇭', name: 'Ghanaian Cedi' },
    { code: 'GNF', flag: '🇬🇳', name: 'Guinean Franc' },
    { code: 'LRD', flag: '🇱🇷', name: 'Liberian Dollar' },
    { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira' },
    { code: 'SLL', flag: '🇸🇱', name: 'Sierra Leonean Leone' },
    { code: 'CVE', flag: '🇨🇻', name: 'Cape Verdean Escudo' },
    { code: 'XAF', flag: '🌍', name: 'Central African CFA Franc' },
    { code: 'STN', flag: '🇸🇹', name: 'São Tomé and Príncipe Dobra' },
    { code: 'BIF', flag: '🇧🇮', name: 'Burundian Franc' },
    { code: 'CDF', flag: '🇨🇩', name: 'Congolese Franc' },
    { code: 'RWF', flag: '🇷🇼', name: 'Rwandan Franc' },
    { code: 'DJF', flag: '🇩🇯', name: 'Djiboutian Franc' },
    { code: 'ERN', flag: '🇪🇷', name: 'Eritrean Nakfa' },
    { code: 'ETB', flag: '🇪🇹', name: 'Ethiopian Birr' },
    { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling' },
    { code: 'KMF', flag: '🇰🇲', name: 'Comorian Franc' },
    { code: 'MGA', flag: '🇲🇬', name: 'Malagasy Ariary' },
    { code: 'MUR', flag: '🇲🇺', name: 'Mauritian Rupee' },
    { code: 'SCR', flag: '🇸🇨', name: 'Seychellois Rupee' },
    { code: 'SOS', flag: '🇸🇴', name: 'Somali Shilling' },
    { code: 'TZS', flag: '🇹🇿', name: 'Tanzanian Shilling' },
    { code: 'UGX', flag: '🇺🇬', name: 'Ugandan Shilling' },
    { code: 'MWK', flag: '🇲🇼', name: 'Malawian Kwacha' },
    { code: 'ZMW', flag: '🇿🇲', name: 'Zambian Kwacha' },
    { code: 'ZWL', flag: '🇿🇼', name: 'Zimbabwean Dollar' },
    { code: 'AOA', flag: '🇦🇴', name: 'Angolan Kwanza' },
    { code: 'BWP', flag: '🇧🇼', name: 'Botswana Pula' },
    { code: 'LSL', flag: '🇱🇸', name: 'Lesotho Loti' },
    { code: 'MZN', flag: '🇲🇿', name: 'Mozambican Metical' },
    { code: 'NAD', flag: '🇳🇦', name: 'Namibian Dollar' },
    { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand' },
    { code: 'SZL', flag: '🇸🇿', name: 'Swazi Lilangeni' },
    { code: 'ZWD', flag: '🇿🇼', name: 'Zimbabwean Dollar (Old)' },
    { code: 'MRO', flag: '🇲🇷', name: 'Mauritanian Ouguiya (Old)' }
];

const DELIVERY_SCOPE_OPTIONS = [
    { value: 'nationwide', label: 'Nationwide', detail: 'Deliver across the whole country.' },
    { value: 'regional', label: 'Regional', detail: 'Deliver to selected regions or states.' },
    { value: 'local', label: 'Local', detail: 'Deliver within one city or pickup radius.' }
];

const AddProductView: React.FC<AddProductViewProps> = ({ sellerId, onCancel, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Dynamic Data State
    const [verticals, setVerticals] = useState<ShopifyVertical[]>([]);
    const [isLoadingVerticals, setIsLoadingVerticals] = useState(true);
    const [categories, setCategories] = useState<ShopifyCategory[]>([]);
    const [brands, setBrands] = useState<ShopifyBrand[]>([]);
    const [availableAttributes, setAvailableAttributes] = useState<ShopifyAttribute[]>([]);
    const [attributeOptionsMap, setAttributeOptionsMap] = useState<Record<string, any[]>>({});

    // Selection State
    const [selectedVertical, setSelectedVertical] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [brandId, setBrandId] = useState('');

    // Promotions
    const [promoText, setPromoText] = useState('');
    const [promoCode, setPromoCode] = useState('');

    // SEO & Delivery
    const [currency, setCurrency] = useState('USD');
    const [seoTitle, setSeoTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [slug, setSlug] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
    const [seoKeywordInput, setSeoKeywordInput] = useState('');
    const [freeDelivery, setFreeDelivery] = useState(false);
    const [deliveryScope, setDeliveryScope] = useState('nationwide');
    const [minOrderValue, setMinOrderValue] = useState<number>(0);
    const [deliveryCost, setDeliveryCost] = useState<number>(0);
    const [deliveryTime, setDeliveryTime] = useState('');
    const [deliveryTimeDays, setDeliveryTimeDays] = useState<number>(1);
    const [isExpressDelivery, setIsExpressDelivery] = useState(false);
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState<number>(0);
    const [tags, setTags] = useState<string[]>([]);
    const [useCaseTags, setUseCaseTags] = useState<string[]>([]);
    const [occasionTags, setOccasionTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [useCaseInput, setUseCaseInput] = useState('');
    const [occasionInput, setOccasionInput] = useState('');

    // Media State
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploadedMedia, setUploadedMedia] = useState<MediaUploadData[]>([]);
    const [uploading, setUploading] = useState(false);

    // Attributes State
    const [attributes, setAttributes] = useState<ProductAttributeData[]>([]);
    const [attributeLoadingState, setAttributeLoadingState] = useState<Record<string, boolean>>({});

    // Variants State
    const [variants, setVariants] = useState<ProductVariantData[]>([]);
    const [hasVariants, setHasVariants] = useState(false);
    const [variantOptions, setVariantOptions] = useState<{ id: string; name: string; values: string[] }[]>([]);
    const [basePrice, setBasePrice] = useState<number>(0);
    const [baseCompareAtPrice, setBaseCompareAtPrice] = useState<number | undefined>(undefined);
    const [baseStock, setBaseStock] = useState<number>(100);
    const [optionValueInputs, setOptionValueInputs] = useState<Record<string, string>>({});
    const currencySymbol = useMemo(() => getCurrencySymbol(currency) || '$', [currency]);

    // Helper to generate variants from options
    useEffect(() => {
        if (!hasVariants) {
            setVariants([]);
            return;
        }

        if (variantOptions.length === 0) {
            setVariants([]);
            return;
        }

        // Generate Cartesian Product
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

        const combinations = generateCombinations(variantOptions);

        // Map to Variant Data, preserving existing values if re-generating
        const newVariants: ProductVariantData[] = combinations.map(combo => {
            // Try to find existing variant with same options to preserve price/stock
            const existing = variants.find(v => JSON.stringify(v.options) === JSON.stringify(combo));
            const anchorPrice = typeof existing?.compare_at_price === 'number'
                ? existing.compare_at_price
                : (typeof baseCompareAtPrice === 'number' ? baseCompareAtPrice : basePrice);

            return {
                sku: existing?.sku || `${title.substring(0, 3).toUpperCase()}-${Object.values(combo).join('-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
                price: existing?.price || basePrice,
                compare_at_price: anchorPrice,
                original_price: anchorPrice,
                stock: typeof existing?.stock === 'number' ? existing.stock : (existing as any)?.quantity ?? baseStock,
                options: combo,
                is_default: false,
                image_url: existing?.image_url
            };
        });

        setVariants(newVariants);
    }, [variantOptions, hasVariants, basePrice, baseCompareAtPrice, baseStock, title]); // Intentionally omitting variants to avoid loops, only re-gen on structure change

    // YouTube URLs
    const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
    const [youtubeInput, setYoutubeInput] = useState('');
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);
    const [activeVideoPreview, setActiveVideoPreview] = useState<string | null>(null);

    const handleAddOptionValue = (optionIndex: number) => {
        const option = variantOptions[optionIndex];
        if (!option) return;
        const raw = (optionValueInputs[option.id] || '').trim();
        if (!raw) return;
        const values = raw
            .split(',')
            .map(v => v.trim())
            .filter(Boolean)
            .filter((v, idx, arr) => arr.indexOf(v) === idx && !option.values.includes(v));
        if (values.length === 0) return;

        const newOptions = [...variantOptions];
        newOptions[optionIndex] = {
            ...option,
            values: [...option.values, ...values]
        };
        setVariantOptions(newOptions);
        setOptionValueInputs(prev => ({ ...prev, [option.id]: '' }));
    };

    const handleAddQuickOption = (name: string, values: string[]) => {
        const exists = variantOptions.some(opt => opt.name.toLowerCase() === name.toLowerCase());
        if (exists) return;
        setVariantOptions(prev => [...prev, { id: Date.now().toString(), name, values }]);
    };

    // Camera
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoadingVerticals(true);
                const verts = await fetchVerticals();
                setVerticals(verts);
            } finally {
                setIsLoadingVerticals(false);
            }
            // Don't fetch brands initially, wait for category
        };
        loadInitialData();
    }, []);

    // Fetch Categories when Vertical Changes
    useEffect(() => {
        if (selectedVertical) {
            fetchCategories(selectedVertical).then(setCategories);
            // Reset downstream
            setCategoryId('');
            setBrands([]);
            setAvailableAttributes([]);
            setAttributes([]);
            setBrandId('');
        } else {
            setCategories([]);
        }
    }, [selectedVertical]);

    // Fetch Brands and Attributes when Category Changes
    useEffect(() => {
        if (categoryId) {
            // Fetch Brands filtered by Category
            fetchBrands(categoryId).then(setBrands);

            // Fetch Attributes (names only - options loaded on-demand)
            fetchAttributes(categoryId).then((attrs) => {
                setAvailableAttributes(attrs);
                // Clear option cache when attributes change
                setAttributeOptionsMap({});
                setAttributeLoadingState({});
            });

            // Reset specific selections
            setBrandId('');
            setAttributes([]);
        } else {
            setBrands([]);
            setAvailableAttributes([]);
            setAttributeOptionsMap({});
            setAttributes([]);
            setAttributeLoadingState({});
        }
    }, [categoryId]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Media Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files) as File[];
            setMediaFiles(prev => [...prev, ...newFiles]);

            // Auto-upload immediately
            setUploading(true);
            try {
                const results = await MediaService.getInstance().uploadFiles(newFiles, sellerId);
                const newUploads: MediaUploadData[] = results.map((res, idx) => ({
                    url: res.url,
                    storage_path: res.storage_path,
                    media_type: res.media_type,
                    is_main: uploadedMedia.length === 0 && idx === 0,
                    position: uploadedMedia.length + idx,
                    alt_text: title
                }));
                setUploadedMedia(prev => [...prev, ...newUploads]);
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Failed to upload some images.');
            } finally {
                setUploading(false);
            }
        }
    };

    const setMainImage = (index: number) => {
        setUploadedMedia(prev => prev.map((item, i) => ({
            ...item,
            is_main: i === index
        })));
    };

    const handleDeleteMedia = (index: number) => {
        setUploadedMedia(prev => prev.filter((_, i) => i !== index));
    };

    // Variant Image Upload
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

    // YouTube URL validation
    const getYouTubeVideoId = (url: string): string | null => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const validateYouTubeUrl = (url: string): boolean => {
        return !!getYouTubeVideoId(url);
    };

    const handleAddYouTubeUrl = () => {
        if (!youtubeInput.trim()) return;
        if (!validateYouTubeUrl(youtubeInput)) {
            alert('Please enter a valid YouTube URL');
            return;
        }
        if (youtubeUrls.includes(youtubeInput)) {
            alert('This video has already been added');
            return;
        }
        if (youtubeUrls.length >= 5) {
            alert('Maximum 5 YouTube videos allowed');
            return;
        }
        setYoutubeUrls(prev => [...prev, youtubeInput]);
        setYoutubeInput('');
        setShowYoutubeInput(false);
        setYoutubePreviewId(null);
    };

    const handleRemoveYouTubeUrl = (url: string) => {
        setYoutubeUrls(prev => prev.filter(u => u !== url));
    };

    // Check preview on input
    useEffect(() => {
        if (youtubeInput) {
            const id = getYouTubeVideoId(youtubeInput);
            setYoutubePreviewId(id);
        } else {
            setYoutubePreviewId(null);
        }
    }, [youtubeInput]);


    // Camera functions
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setShowCamera(true);
        } catch (error) {
            console.error('Camera access failed:', error);
            alert('Unable to access camera. Please check permissions.');
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setMediaFiles(prev => [...prev, file]);

            // Auto-upload
            setUploading(true);
            try {
                const results = await MediaService.getInstance().uploadFiles([file], sellerId);
                const newUpload: MediaUploadData = {
                    url: results[0].url,
                    storage_path: results[0].storage_path,
                    media_type: results[0].media_type,
                    is_main: uploadedMedia.length === 0,
                    position: uploadedMedia.length,
                    alt_text: title
                };
                setUploadedMedia(prev => [...prev, newUpload]);
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Failed to upload captured photo.');
            } finally {
                setUploading(false);
            }

            closeCamera();
        }, 'image/jpeg', 0.8);
    };

    // Load Attribute Options On-Demand
    const loadAttributeOptions = async (attributeId: string) => {
        // Don't fetch if already loaded or currently loading
        if (attributeOptionsMap[attributeId] || attributeLoadingState[attributeId]) {
            return;
        }

        // Set loading state
        setAttributeLoadingState(prev => ({ ...prev, [attributeId]: true }));

        try {
            const options = await fetchAttributeOptions(attributeId);
            setAttributeOptionsMap(prev => ({
                ...prev,
                [attributeId]: options
            }));
        } catch (error) {
            console.error(`Error loading options for attribute ${attributeId}:`, error);
        } finally {
            setAttributeLoadingState(prev => ({ ...prev, [attributeId]: false }));
        }
    };

    // Auto-load options for all attributes when they become available
    useEffect(() => {
        if (availableAttributes.length > 0) {
            availableAttributes.forEach(attr => {
                loadAttributeOptions(attr.id);
            });
        }
    }, [availableAttributes]);

    // Attribute Change Handler
    const handleAttributeChange = (attributeId: string, value: string, optionId?: string) => {
        setAttributes(prev => {
            const existing = prev.filter(p => p.attribute_id !== attributeId);
            const attrDef = availableAttributes.find(a => a.id === attributeId);
            return [...existing, {
                attribute_id: attributeId,
                name: attrDef?.name || '',
                value: value,
                value_option_id: optionId,
                value_text: value
            }];
        });
    };

    const addToken = (raw: string, setter: React.Dispatch<React.SetStateAction<string[]>>, clearInput: () => void) => {
        const value = raw.trim();
        if (!value) return;
        setter(prev => prev.includes(value) ? prev : [...prev, value]);
        clearInput();
    };

    const removeToken = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(prev => prev.filter(item => item !== value));
    };

    // Final Submission
    const handleSubmit = async () => {
        if (!categoryId || !title || !basePrice) {
            alert('Please fill in all required fields (Title, Category, Price).');
            return;
        }

        if (typeof baseCompareAtPrice === 'number' && baseCompareAtPrice < basePrice) {
            alert('Original/compare-at price should be greater than or equal to the selling price to show a valid discount.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Merge uploaded media with YouTube URLs
            const youtubeMedia: MediaUploadData[] = youtubeUrls.map((url, idx) => ({
                url,
                storage_path: '', // No storage path for YouTube
                media_type: 'youtube', // Type update we just made
                is_main: false,
                position: uploadedMedia.length + idx,
                alt_text: title
            }));

            const allMedia = [...uploadedMedia, ...youtubeMedia];

            const safeTags = tags.map(t => t.trim()).filter(Boolean);
            const safeUseCases = useCaseTags.map(t => t.trim()).filter(Boolean);
            const safeOccasions = occasionTags.map(t => t.trim()).filter(Boolean);
            const joinedSeoKeywords = seoKeywords.map(k => k.trim()).filter(Boolean).join(', ');

            const preparedVariants = (variants.length > 0 ? variants : [{
                sku: `${title.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
                price: basePrice,
                compare_at_price: baseCompareAtPrice ?? basePrice,
                original_price: baseCompareAtPrice ?? basePrice,
                stock: baseStock,
                options: {},
                is_default: true
            }]).map(variant => {
                const rrp = typeof variant.compare_at_price === 'number' ? variant.compare_at_price : variant.price;
                const discountPercent = rrp && variant.price ? Math.max(0, Math.round(((rrp - variant.price) / rrp) * 100)) : undefined;
                return {
                    ...variant,
                    rrp,
                    discount_percent: discountPercent
                };
            });

            const safeDeliveryScope = DELIVERY_SCOPE_OPTIONS.some(opt => opt.value === deliveryScope)
                ? deliveryScope
                : 'nationwide';

            const payload = {
                title,
                description,
                category_id: categoryId,
                brand_id: brandId || undefined,
                currency: currency,
                promo_text: promoText || undefined,
                promo_code: promoCode || undefined,
                free_delivery: freeDelivery,
                delivery_scope: safeDeliveryScope,
                min_order_value: Number.isFinite(minOrderValue) ? minOrderValue : 0,
                min_order_for_free_delivery: Number.isFinite(minOrderForFreeDelivery) ? minOrderForFreeDelivery : 0,
                is_express_delivery: isExpressDelivery,
                seo_title: seoTitle,
                meta_description: metaDescription,
                url_slug: slug,
                canonical_url: canonicalUrl || undefined,
                seo_keywords: joinedSeoKeywords || undefined,
                delivery_cost: Number.isFinite(deliveryCost) ? deliveryCost : 0,
                delivery_time_estimate: deliveryTime,
                delivery_time_days: Number.isFinite(deliveryTimeDays) ? deliveryTimeDays : 1,
                tags: safeTags,
                use_case_tags: safeUseCases,
                occasion_tags: safeOccasions,
                attributes,
                variants: preparedVariants,
                media: allMedia.map((m, i) => ({ ...m, position: i }))
            };

            const productId = await createProductFull(
                sellerId,
                payload,
                payload.variants,
                payload.media,
                payload.attributes
            );

            if (productId) {

                alert('Product published successfully. It is now pending approval.');
                onSuccess();
            } else {
                throw new Error('Failed to create product record.');
            }

        } catch (error) {
            console.error('Submission failed:', error);
            alert('Failed to publish product. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-40">
            <div className="max-w-4xl mx-auto py-12 px-6">
                {/* Progress Indicators */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${index <= currentStep ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${index <= currentStep ? 'text-orange-600' : 'text-gray-400'
                                    }`}>{step}</span>
                            </div>
                        ))}
                        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-0" />
                        <div
                            className="absolute top-4 left-0 h-0.5 bg-orange-500 -z-0 transition-all duration-300"
                            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>

                            {/* Vertical & Category with Searchable Selects */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    {isLoadingVerticals ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-4 w-24 bg-gray-200 rounded" />
                                            <div className="h-11 w-full bg-gray-100 rounded-lg border border-gray-200" />
                                        </div>
                                    ) : (
                                        <SearchableSelect
                                            label="Vertical *"
                                            options={verticals}
                                            value={selectedVertical}
                                            onChange={(val) => setSelectedVertical(val)}
                                            placeholder="Select Vertical"
                                            loading={isLoadingVerticals}
                                        />
                                    )}
                                </div>
                                <div>
                                    <SearchableSelect
                                        label="Category *"
                                        options={categories}
                                        value={categoryId}
                                        onChange={(val) => setCategoryId(val)}
                                        disabled={!selectedVertical}
                                        placeholder={selectedVertical ? "Select Category" : "Select Vertical First"}
                                    />
                                </div>
                            </div>

                            {/* Product Details */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="e.g. Nike Air Max 2023"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Describe your product..."
                                />
                            </div>

                            {/* Brand Selection - Enhanced with trickle down */}
                            <div>
                                <SearchableSelect
                                    label="Brand"
                                    options={brands}
                                    value={brandId}
                                    onChange={(val) => setBrandId(val)}
                                    disabled={!categoryId}
                                    placeholder={categoryId ? "Search Brand..." : "Select Category First"}
                                />
                            </div>

                            {/* Promotional Settings - New for modern posting */}
                            <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Promotional Settings (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Promo Text</label>
                                        <input
                                            type="text"
                                            value={promoText}
                                            onChange={(e) => setPromoText(e.target.value)}
                                            maxLength={40}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="e.g. SUMMER SALE - 20% OFF"
                                        />
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Appears as a banner on the product card.</p>
                                            <p className={`text-xs ${promoText.length > 35 ? 'text-orange-600' : 'text-gray-400'}`}>
                                                {promoText.length}/40
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                                        <div className="relative">
                                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">local_offer</span>
                                            <input
                                                type="text"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none uppercase font-mono tracking-wider"
                                                placeholder="SUMMER20"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Discount code to be displayed with the promo text.</p>
                                    </div>
                                </div>
                            </div>

                            {/* SEO & Delivery Sections */}
                            <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Currency & Shipping</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                        >
                                            {SUPPORTED_CURRENCIES.map(curr => (
                                                <option key={curr.code} value={curr.code}>
                                                    {curr.flag} {curr.code} - {curr.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Cost</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                value={deliveryCost}
                                                onChange={(e) => setDeliveryCost(parseFloat(e.target.value))}
                                                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="0.00"
                                                min={0}
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Est. Delivery Time</label>
                                        <input
                                            type="text"
                                            value={deliveryTime}
                                            onChange={(e) => setDeliveryTime(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="e.g. 3-5 Days"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time (Days)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={deliveryTimeDays}
                                            onChange={(e) => setDeliveryTimeDays(parseInt(e.target.value) || 1)}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder="1"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Used for delivery SLA and express promises.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Value</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={minOrderValue}
                                                onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Orders below this amount are prevented at checkout.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Free Delivery Threshold</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={minOrderForFreeDelivery}
                                                onChange={(e) => setMinOrderForFreeDelivery(parseFloat(e.target.value) || 0)}
                                                className={`w-full border rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none ${freeDelivery ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                                                placeholder="e.g. 50.00"
                                                disabled={!freeDelivery}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Set the spend required to unlock free delivery.</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Delivery Scope</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {DELIVERY_SCOPE_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setDeliveryScope(option.value)}
                                                className={`text-left p-4 rounded-lg border transition shadow-sm ${deliveryScope === option.value ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-gray-200 bg-white hover:border-orange-200'}`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium">{option.label}</span>
                                                    <span className={`material-icons text-sm ${deliveryScope === option.value ? 'text-orange-500' : 'text-gray-300'}`}>
                                                        {deliveryScope === option.value ? 'check_circle' : 'radio_button_unchecked'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600">{option.detail}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Free Delivery</p>
                                            <p className="text-xs text-gray-500">Toggle if delivery cost is waived above the threshold.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFreeDelivery(!freeDelivery)}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${freeDelivery ? 'bg-orange-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`${freeDelivery ? 'translate-x-6' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Express Delivery</p>
                                            <p className="text-xs text-gray-500">Flag orders that can ship faster than standard.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsExpressDelivery(!isExpressDelivery)}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isExpressDelivery ? 'bg-orange-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`${isExpressDelivery ? 'translate-x-6' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">SEO Settings (Optional)</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                                        <input
                                            type="text"
                                            value={seoTitle}
                                            onChange={(e) => setSeoTitle(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                            placeholder={title || "Product Title"}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave blank to use product title.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                                            <input
                                                type="text"
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="e.g. mens-slim-fit-jeans"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                                            <input
                                                type="text"
                                                value={metaDescription}
                                                onChange={(e) => setMetaDescription(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="Brief description for search results"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
                                            <input
                                                type="url"
                                                value={canonicalUrl}
                                                onChange={(e) => setCanonicalUrl(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="https://yourstore.com/products/slug"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={seoKeywordInput}
                                                    onChange={(e) => setSeoKeywordInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addToken(seoKeywordInput, setSeoKeywords, () => setSeoKeywordInput(''));
                                                        }
                                                    }}
                                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                    placeholder="Add keyword and press Enter"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addToken(seoKeywordInput, setSeoKeywords, () => setSeoKeywordInput(''))}
                                                    className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {seoKeywords.map(keyword => (
                                                    <span key={keyword} className="bg-orange-100 text-orange-800 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        {keyword}
                                                        <button type="button" onClick={() => removeToken(keyword, setSeoKeywords)} className="hover:text-red-500">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Discovery Tags</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addToken(tagInput, setTags, () => setTagInput(''));
                                                    }
                                                }}
                                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="Add tag and press Enter"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addToken(tagInput, setTags, () => setTagInput(''))}
                                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {tags.map(tag => (
                                                <span key={tag} className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                                                    {tag}
                                                    <button type="button" onClick={() => removeToken(tag, setTags)} className="hover:text-red-500">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Use Case Tags</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={useCaseInput}
                                                onChange={(e) => setUseCaseInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addToken(useCaseInput, setUseCaseTags, () => setUseCaseInput(''));
                                                    }
                                                }}
                                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="e.g. Remote work, Travel"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addToken(useCaseInput, setUseCaseTags, () => setUseCaseInput(''))}
                                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {useCaseTags.map(tag => (
                                                <span key={tag} className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                                                    {tag}
                                                    <button type="button" onClick={() => removeToken(tag, setUseCaseTags)} className="hover:text-red-500">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Occasion Tags</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={occasionInput}
                                                onChange={(e) => setOccasionInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addToken(occasionInput, setOccasionTags, () => setOccasionInput(''));
                                                    }
                                                }}
                                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="e.g. Birthday, Wedding"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addToken(occasionInput, setOccasionTags, () => setOccasionInput(''))}
                                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {occasionTags.map(tag => (
                                                <span key={tag} className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                                                    {tag}
                                                    <button type="button" onClick={() => removeToken(tag, setOccasionTags)} className="hover:text-red-500">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Media Gallery</h2>

                            {/* Camera and File Upload Options */}
                            <div className="flex gap-4">
                                <button
                                    onClick={openCamera}
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <span className="material-icons">camera_alt</span>
                                    Take Photo
                                </button>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileUpload}
                                />
                                <div className="space-y-2">
                                    <span className="material-icons text-4xl text-gray-400">cloud_upload</span>
                                    <p className="text-gray-600 font-medium">Drop images here or click to upload</p>
                                    <p className="text-xs text-gray-400">Supports JPG, PNG, MP4</p>
                                </div>
                            </div>

                            {uploading && (
                                <div className="text-center text-orange-500 text-sm font-medium animate-pulse">
                                    Uploading media...
                                </div>
                            )}

                            {uploadedMedia.length > 0 && (
                                <div className="grid grid-cols-4 gap-4 mt-6">
                                    {uploadedMedia.map((media, index) => (
                                        <div key={index} className={`relative group rounded-lg overflow-hidden border-2 h-32 ${media.is_main ? 'border-orange-500' : 'border-gray-200'}`}>
                                            <img src={media.url} alt="preview" className="w-full h-full object-cover" />
                                            {media.is_main && (
                                                <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded font-medium">Main</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {!media.is_main && (
                                                    <button
                                                        onClick={() => setMainImage(index)}
                                                        className="text-white hover:text-orange-200 text-xs font-medium bg-black/50 px-2 py-1 rounded"
                                                    >
                                                        Set Main
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteMedia(index)}
                                                    className="text-white hover:text-red-400 text-xs font-medium bg-black/50 px-2 py-1 rounded"
                                                >
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* YouTube URLs Section with Reference UI */}
                            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200 mt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons text-red-600 text-xl">play_circle</span>
                                        <h4 className="text-sm font-medium text-gray-800">YouTube Videos</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">{youtubeUrls.length}/5</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                                        >
                                            <span className="material-icons text-xs">add</span> Add Video
                                        </button>
                                    </div>
                                </div>

                                {showYoutubeInput && (
                                    <div className="mb-4 space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={youtubeInput}
                                                onChange={(e) => setYoutubeInput(e.target.value)}
                                                placeholder="https://youtube.com/watch?v=..."
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddYouTubeUrl}
                                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                                            >
                                                <span className="material-icons text-sm">add</span>
                                            </button>
                                        </div>

                                        {/* Validation Preview */}
                                        {youtubePreviewId && (
                                            <div className="bg-white p-3 rounded border border-gray-200 flex items-center gap-3 animate-fade-in">
                                                <img
                                                    src={`https://img.youtube.com/vi/${youtubePreviewId}/mqdefault.jpg`}
                                                    alt="Video preview"
                                                    className="w-24 h-16 object-cover rounded bg-gray-100"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                        <span className="material-icons text-sm">check_circle</span>
                                                        Valid URL
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">Ready to add</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {youtubeUrls.map((url, index) => {
                                        const vidId = getYouTubeVideoId(url);
                                        return (
                                            <div key={index} className="youtube-video-item bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <div
                                                    className="aspect-video bg-gray-100 relative group cursor-pointer"
                                                    onClick={() => vidId && setActiveVideoPreview(vidId)}
                                                >
                                                    <img
                                                        src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`}
                                                        alt="YouTube video thumbnail"
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                                                        <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform shadow-lg">
                                                            <span className="material-icons text-xl pl-1">play_arrow</span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-[10px] px-2 py-0.5 rounded">
                                                        Click to Preview
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveYouTubeUrl(url); }}
                                                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                                                    >
                                                        <span className="material-icons text-xs">close</span>
                                                    </button>
                                                </div>
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="text-xs text-gray-600 font-medium">YouTube Video {index + 1}</div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                                                onClick={() => vidId && setActiveVideoPreview(vidId)}
                                                            >
                                                                <span className="material-icons text-xs">visibility</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-blue-600 truncate">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                                            <span className="material-icons text-[10px]">open_in_new</span> Watch on YouTube
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {youtubeUrls.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <span className="material-icons text-4xl mb-2 text-red-200">play_circle</span>
                                        <p className="text-sm">No YouTube videos added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Product Attributes</h2>
                            <p className="text-sm text-gray-500">Specific details based on your category. Click on each attribute to load available options.</p>

                            {availableAttributes.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    No specific attributes found for this category. You can skip this step.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    {availableAttributes.map(attr => {
                                        const currentValue = attributes.find(a => a.attribute_id === attr.id)?.value || '';
                                        const hasOptions = attributeOptionsMap[attr.id] && attributeOptionsMap[attr.id].length > 0;
                                        const isLoadingOptions = attributeLoadingState[attr.id];

                                        return (
                                            <div key={attr.id} className="relative">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">{attr.name}</label>

                                                {/* Show options if loaded */}
                                                {hasOptions && !isLoadingOptions && (
                                                    <SearchableSelect
                                                        label=""
                                                        options={attributeOptionsMap[attr.id].map(opt => ({ id: opt.value, name: opt.value, originalId: opt.id }))}
                                                        value={currentValue}
                                                        onChange={(val) => {
                                                            const originalOption = attributeOptionsMap[attr.id].find(o => o.value === val);
                                                            handleAttributeChange(attr.id, val, originalOption?.id);
                                                        }}
                                                        placeholder={`Select ${attr.name}...`}
                                                    />
                                                )}

                                                {/* Show text input if no options or options not loaded yet */}
                                                {(!hasOptions && !isLoadingOptions) && (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                            value={currentValue}
                                                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                                                            onFocus={() => !hasOptions && !isLoadingOptions && loadAttributeOptions(attr.id)}
                                                            placeholder={`Enter ${attr.name}`}
                                                        />
                                                    </div>
                                                )}

                                                {/* Loading state */}
                                                {isLoadingOptions && (
                                                    <div className="flex items-center justify-center border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-icons animate-spin text-sm">refresh</span>
                                                            <span className="text-sm text-gray-500">Loading options...</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Variants & Pricing</h2>
                                    <p className="text-sm text-gray-500">Define product options (Size, Color) or set simple pricing.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${!hasVariants ? 'text-orange-600' : 'text-gray-500'}`}>Simple Product</span>
                                    <button
                                        type="button"
                                        onClick={() => setHasVariants(!hasVariants)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${hasVariants ? 'bg-orange-600' : 'bg-gray-200'}`}
                                    >
                                        <span
                                            className={`${hasVariants ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                    <span className={`text-sm font-medium ${hasVariants ? 'text-orange-600' : 'text-gray-500'}`}>Multiple Variants</span>
                                </div>
                            </div>

                            {!hasVariants ? (
                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 animate-fade-in">
                                    <h3 className="font-semibold text-gray-900 mb-4">Standard Pricing</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price ({currencySymbol}{currency}) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={basePrice || ''}
                                                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                                                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Original / Compare-at Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={typeof baseCompareAtPrice === 'number' ? baseCompareAtPrice : ''}
                                                    onChange={(e) => setBaseCompareAtPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                    placeholder="Anchor price (e.g. 120.00)"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">Shows the strike-through reference price to anchor value and highlight savings.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                                            <input
                                                type="number"
                                                value={baseStock}
                                                onChange={(e) => setBaseStock(parseInt(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-orange-700 mt-2">Tip: A higher original price anchors perceived value and increases urgency to buy.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Option Builder */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Product Options</h3>
                                                <p className="text-xs text-gray-500">Add up to 3 options (e.g. Color, Size). Values are added as chips.</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span className="text-gray-500">Quick add:</span>
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100"
                                                    onClick={() => handleAddQuickOption('Color', ['Black', 'White', 'Blue'])}
                                                >
                                                    Color
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100"
                                                    onClick={() => handleAddQuickOption('Size', ['S', 'M', 'L'])}
                                                >
                                                    Size
                                                </button>
                                            </div>
                                        </div>

                                        {variantOptions.length === 0 && (
                                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 bg-gray-50">
                                                No options yet. Add one to generate variants.
                                            </div>
                                        )}

                                        {variantOptions.map((option, idx) => (
                                            <div key={option.id} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <div className="md:w-1/3">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Option Name</label>
                                                        <div className="relative group">
                                                            <input
                                                                type="text"
                                                                list={`option-suggestions-${idx}`}
                                                                value={option.name}
                                                                onChange={(e) => {
                                                                    const newOptions = [...variantOptions];
                                                                    newOptions[idx].name = e.target.value;
                                                                    setVariantOptions(newOptions);
                                                                }}
                                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                                                placeholder="e.g. Color"
                                                            />
                                                            <datalist id={`option-suggestions-${idx}`}>
                                                                <option value="Size" />
                                                                <option value="Color" />
                                                                <option value="Material" />
                                                                <option value="Style" />
                                                                <option value="Design" />
                                                                <option value="Weight" />
                                                                <option value="Dimensions" />
                                                            </datalist>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-xs font-medium text-gray-500">Option Values</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newOptions = variantOptions.filter((_, i) => i !== idx);
                                                                    setVariantOptions(newOptions);
                                                                }}
                                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                                                aria-label="Remove option"
                                                            >
                                                                <span className="material-icons text-base">delete</span>
                                                            </button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={optionValueInputs[option.id] || ''}
                                                                onChange={(e) => setOptionValueInputs(prev => ({ ...prev, [option.id]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ',') {
                                                                        e.preventDefault();
                                                                        handleAddOptionValue(idx);
                                                                    }
                                                                }}
                                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                                                placeholder="Type a value and press Enter"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddOptionValue(idx)}
                                                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                        {option.values.length === 0 && (
                                                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                                                <span className="material-icons text-xs">info</span>
                                                                Type a value and click "Add" or press Enter
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {option.values.map((val, vIdx) => (
                                                                <span key={vIdx} className="bg-orange-100 text-orange-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-medium">
                                                                    {val}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newOptions = [...variantOptions];
                                                                            newOptions[idx].values = newOptions[idx].values.filter((_, i) => i !== vIdx);
                                                                            setVariantOptions(newOptions);
                                                                        }}
                                                                        className="hover:text-red-500 ml-1"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => setVariantOptions([...variantOptions, { id: Date.now().toString(), name: '', values: [] }])}
                                            className="text-orange-600 text-sm font-medium hover:text-orange-700 flex items-center gap-1"
                                        >
                                            <span className="material-icons text-sm">add</span> Add Option
                                        </button>
                                    </div>

                                    {/* Generated Variants Table */}
                                    {variants.length > 0 && (
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">
                                                    {variants.length} {variants.length === 1 ? 'Variant' : 'Variants'} Generated
                                                </h3>
                                                <div className="text-xs text-gray-500">
                                                    Update price/stock below
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                                        <tr>
                                                            <th className="px-6 py-3">Variant</th>
                                                            <th className="px-6 py-3">Image</th>
                                                            <th className="px-6 py-3">Price ({currencySymbol}{currency})</th>
                                                            <th className="px-6 py-3">Original Price</th>
                                                            <th className="px-6 py-3">Stock</th>
                                                            <th className="px-6 py-3">SKU</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {variants.map((variant, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                                    {Object.values(variant.options).join(' / ')}
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <div className="relative w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-orange-500 transition-colors group">
                                                                        {variant.image_url ? (
                                                                            <img src={variant.image_url} alt="Variant" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="material-icons text-gray-400 text-lg">add_photo_alternate</span>
                                                                        )}
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                                            onChange={(e) => handleVariantImageUpload(idx, e)}
                                                                        />
                                                                        {variant.image_url && (
                                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                <span className="material-icons text-white text-sm">edit</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-gray-500 text-sm">{currencySymbol}</span>
                                                                        <input
                                                                            type="number"
                                                                            value={variant.price}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...variants];
                                                                                newVariants[idx].price = parseFloat(e.target.value) || 0;
                                                                                setVariants(newVariants);
                                                                            }}
                                                                            className="w-24 border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-gray-500 text-sm">{currencySymbol}</span>
                                                                        <input
                                                                            type="number"
                                                                            value={variant.compare_at_price ?? ''}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...variants];
                                                                                const newValue = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                                newVariants[idx].compare_at_price = newValue;
                                                                                newVariants[idx].original_price = newValue;
                                                                                setVariants(newVariants);
                                                                            }}
                                                                            className="w-24 border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none"
                                                                            placeholder="Anchor"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <input
                                                                        type="number"
                                                                        value={variant.stock ?? 0}
                                                                        onChange={(e) => {
                                                                            const newVariants = [...variants];
                                                                            newVariants[idx].stock = parseInt(e.target.value) || 0;
                                                                            setVariants(newVariants);
                                                                        }}
                                                                        className="w-24 border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3 text-gray-400 text-xs">
                                                                    {variant.sku}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="text-center mt-6">
                                <p className="text-xs text-gray-400">
                                    Tip: You can add product images specific to variants after creation.
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Review & Publish</h2>

                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Product Title</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{title}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Price</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{currencySymbol}{basePrice} {currency}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Original / Compare Price</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{typeof baseCompareAtPrice === 'number' ? `${currencySymbol}${baseCompareAtPrice} ${currency}` : 'Not set'}</dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {categories.find(c => c.id === categoryId)?.name || 'Unknown'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Media</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{uploadedMedia.length} images + {youtubeUrls.length} videos</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{description || 'No description provided'}</dd>
                                </div>
                            </dl>


                        </div>
                    )}
                </div>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-50">
                    <div className="flex flex-col h-full">
                        <div className="bg-black text-white p-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Take Photo</h3>
                            <button onClick={closeCamera} className="text-white hover:text-gray-300">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="flex-1 relative bg-black">
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover hidden" />
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                                <button
                                    onClick={capturePhoto}
                                    className="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <span className="material-icons text-2xl">camera</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* YouTube Preview Modal */}
            {activeVideoPreview && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setActiveVideoPreview(null)}>
                    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                        <iframe
                            src={`https://www.youtube.com/embed/${activeVideoPreview}?autoplay=1`}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                        <button
                            onClick={() => setActiveVideoPreview(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                        >
                            <span className="material-icons text-3xl">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Sticky Actions */}
            <div className="fixed bottom-0 right-0 ml-64 bg-white border-t border-gray-200 p-4 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center px-6">
                    <button
                        onClick={currentStep === 0 ? onCancel : handleBack}
                        disabled={isSubmitting}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        {currentStep === 0 ? 'Cancel' : 'Back'}
                    </button>

                    {currentStep === steps.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="material-icons animate-spin text-sm">refresh</span>
                                    Publishing...
                                </>
                            ) : (
                                'Publish Product'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-8 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddProductView;
