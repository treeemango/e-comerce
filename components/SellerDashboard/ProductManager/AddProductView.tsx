import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CreateProductPayload, ProductAttributeData, ProductVariantData, MediaUploadData, ShopifyVertical, ShopifyCategory, ShopifyBrand, ShopifyAttribute, QuantityDiscountTier } from '../../../types';
import { createProductFull, fetchVerticals, fetchCategories, fetchBrands, fetchAttributes, fetchAttributeOptions } from '../../../lib/api';
import { MediaService } from '../../../lib/media';
import { getCurrencySymbol } from '../../../lib/currency';
import { cn } from '../../../lib/utils';
import { aiService } from '../../../lib/ai-service';
import { supabase } from '../../../lib/supabase';


// --- Searchable Select Component ---
interface SearchableSelectProps {
    label: string;
    options: { id: string | number; name: string }[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    loading = false,
    error,
    onRetry
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id.toString() === value.toString());

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

            {error ? (
                <div className="flex items-center justify-between px-4 py-2 border border-red-200 rounded-lg bg-red-50 text-red-700">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-sm">error</span>
                        <span className="text-xs font-medium">{error}</span>
                    </div>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); onRetry(); }}
                            className="bg-white border border-red-200 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-50 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            ) : (
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
            )}

            {isOpen && !isDisabled && !error && (
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
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 hover:text-orange-900 ${opt.id.toString() === value.toString() ? 'bg-orange-50 text-orange-900 font-medium' : 'text-gray-700'}`}
                                    onClick={() => {
                                        onChange(opt.id.toString());
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

const steps = ['Basic Info', 'Media', 'Attributes', 'Pricing & Delivery', 'SEO & Review'];

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
    { value: 'local', label: 'City / Local', detail: 'Deliver within one city or pickup radius.' }
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

// Searchable Multi-Select for Regions
interface RegionMultiSelectProps {
    selectedRegions: string[];
    onChange: (regions: string[]) => void;
    placeholder?: string;
}

const RegionMultiSelect: React.FC<RegionMultiSelectProps> = ({
    selectedRegions,
    onChange,
    placeholder = 'Search and select regions...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                            className="bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm border border-orange-200 group hover:shadow-md transition-all"
                        >
                            <span>{getRegionIcon(regionId)}</span>
                            <span>{getRegionName(regionId)}</span>
                            <button
                                type="button"
                                onClick={() => handleToggleRegion(regionId)}
                                className="text-orange-400 hover:text-red-500 transition-colors"
                            >
                                <span className="material-icons text-[14px]">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search input trigger */}
            <div
                onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all",
                    isOpen
                        ? "border-orange-500 bg-white shadow-lg shadow-orange-100/50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                )}
            >
                <span className="material-icons text-orange-500 text-lg">travel_explore</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 placeholder-gray-400"
                />
                <span className={cn(
                    "material-icons text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )}>expand_more</span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-[70] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Regions</span>
                            {selectedRegions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2">
                        {Object.keys(groupedRegions).length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <span className="material-icons text-3xl mb-2">search_off</span>
                                <p className="text-sm">No regions found</p>
                            </div>
                        ) : (
                            Object.entries(groupedRegions).map(([group, regions]) => (
                                <div key={group} className="mb-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 sticky top-0 bg-white/90 backdrop-blur-sm">
                                        {group}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                        {regions.map(region => {
                                            const isSelected = selectedRegions.includes(region.id);
                                            return (
                                                <button
                                                    key={region.id}
                                                    type="button"
                                                    onClick={() => handleToggleRegion(region.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm",
                                                        isSelected
                                                            ? "bg-orange-100 text-orange-800 font-bold ring-1 ring-orange-200"
                                                            : "hover:bg-gray-50 text-gray-700"
                                                    )}
                                                >
                                                    <span className="text-base">{region.icon}</span>
                                                    <span className="flex-1 truncate">{region.name}</span>
                                                    {isSelected && (
                                                        <span className="material-icons text-orange-600 text-sm">check_circle</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            <strong className="text-orange-600">{selectedRegions.length}</strong> region(s) selected
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AddProductView: React.FC<AddProductViewProps> = ({ sellerId, onCancel, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // AI States
    const [isImprovingTitle, setIsImprovingTitle] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [isGeneratingUseCaseTags, setIsGeneratingUseCaseTags] = useState(false);
    const [isGeneratingOccasionTags, setIsGeneratingOccasionTags] = useState(false);


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
    const [pricingUnit, setPricingUnit] = useState('piece');

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
    const [delayCredit, setDelayCredit] = useState<number>(0);
    const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState<number>(0);
    const [deliveryLocations, setDeliveryLocations] = useState<string[]>([]);
    const [deliveryLocationInput, setDeliveryLocationInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [useCaseTags, setUseCaseTags] = useState<string[]>([]);
    const [occasionTags, setOccasionTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [useCaseInput, setUseCaseInput] = useState('');
    const [occasionInput, setOccasionInput] = useState('');
    const [listingType, setListingType] = useState<'direct_purchase' | 'inquiry' | 'reservation'>('direct_purchase');
    const [condition, setCondition] = useState<'new' | 'used' | 'refurbished' | 'open_box' | 'digital'>('new');
    const [quantityDiscounts, setQuantityDiscounts] = useState<QuantityDiscountTier[]>([]);

    // Media State
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploadedMedia, setUploadedMedia] = useState<MediaUploadData[]>([]);
    const [uploading, setUploading] = useState(false);

    // Attributes State
    const [attributes, setAttributes] = useState<ProductAttributeData[]>([]);
    const [attributeLoadingState, setAttributeLoadingState] = useState<Record<string, boolean>>({});
    const [attributeErrorState, setAttributeErrorState] = useState<Record<string, string>>({});

    // Fetch Errors
    const [errorVerticals, setErrorVerticals] = useState<string | null>(null);
    const [errorCategories, setErrorCategories] = useState<string | null>(null);
    const [errorBrands, setErrorBrands] = useState<string | null>(null);
    const [errorAttributes, setErrorAttributes] = useState<string | null>(null);

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
                // Use proper type checking instead of || which treats 0 as falsy
                price: (typeof existing?.price === 'number' && !isNaN(existing.price)) ? existing.price : basePrice,
                compare_at_price: anchorPrice,
                original_price: anchorPrice,
                stock: (typeof existing?.stock === 'number' && !isNaN(existing.stock)) ? existing.stock : baseStock,
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
    const loadVerticalsAction = async () => {
        setIsLoadingVerticals(true);
        setErrorVerticals(null);
        try {
            const data = await fetchVerticals();
            setVerticals(data);
        } catch (err) {
            console.error('Error fetching verticals:', err);
            setErrorVerticals('Failed to load verticals');
        } finally {
            setIsLoadingVerticals(false);
        }
    };

    useEffect(() => {
        loadVerticalsAction();
    }, []);

    // Fetch Categories when Vertical Changes
    const loadCategoriesAction = async (verticalId: string) => {
        setErrorCategories(null);
        try {
            const data = await fetchCategories(verticalId);
            setCategories(data);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setErrorCategories('Failed to load categories');
        }
    };

    useEffect(() => {
        if (selectedVertical) {
            loadCategoriesAction(selectedVertical);
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
    const loadCategoryDetailsAction = async (catId: string) => {
        setErrorBrands(null);
        setErrorAttributes(null);

        // Fetch Brands
        try {
            const data = await fetchBrands(catId);
            setBrands(data);
        } catch (err) {
            console.error('Error fetching brands:', err);
            setErrorBrands('Failed to load brands');
        }

        // Fetch Attributes
        try {
            const attrs = await fetchAttributes(catId);
            setAvailableAttributes(attrs);
            setAttributeOptionsMap({});
            setAttributeLoadingState({});
            setAttributeErrorState({});
        } catch (err) {
            console.error('Error fetching attributes:', err);
            setErrorAttributes('Failed to load attributes');
        }
    };

    useEffect(() => {
        if (categoryId) {
            loadCategoryDetailsAction(categoryId);
            // Reset specific selections
            setBrandId('');
            setAttributes([]);
        } else {
            setBrands([]);
            setAvailableAttributes([]);
            setAttributeOptionsMap({});
            setAttributes([]);
            setAttributeLoadingState({});
            setAttributeErrorState({});
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

    // AI Generation Handlers
    const handleImproveTitle = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsImprovingTitle(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            const improved = await aiService.improveTitle(title, categoryName);
            if (improved) {
                setTitle(improved);
            }
        } catch (error) {
            console.error('AI Title error:', error);
            alert('AI was unable to improve the title. Please try again.');
        } finally {
            setIsImprovingTitle(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsGeneratingDescription(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            const desc = await aiService.generateDescription(title, categoryName, attributes);
            if (desc) {
                setDescription(desc);
            }
        } catch (error) {
            console.error('AI Description error:', error);
            alert('AI was unable to generate a description. Please try again.');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateSEO = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsGeneratingSEO(true);
        try {
            const seoData = await aiService.generateSEO(title, description);
            if (seoData) {
                setSeoTitle(seoData.seo_title);
                setMetaDescription(seoData.meta_description);
                if (seoData.keywords) {
                    const keywordsArray = seoData.keywords.split(',').map(k => k.trim()).filter(Boolean);
                    setSeoKeywords(prev => Array.from(new Set([...prev, ...keywordsArray])));
                }

                // Auto-generate slug from SEO title or title (matching mobile logic)
                const slugSource = seoData.seo_title || title;
                setSlug(slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
            }
        } catch (error) {
            console.error('AI SEO error:', error);
            alert('AI was unable to generate SEO metadata. Please try again.');
        } finally {
            setIsGeneratingSEO(false);
        }
    };

    const handleGenerateTags = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsGeneratingTags(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateTags(title, categoryName);
            if (res && res.length > 0) {
                setTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (error) {
            console.error('AI Tags error:', error);
            alert('AI was unable to generate tags. Please try again.');
        } finally {
            setIsGeneratingTags(false);
        }
    };

    const handleGenerateUseCaseTags = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsGeneratingUseCaseTags(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateUseCaseTags(title, categoryName);
            if (res && res.length > 0) {
                setUseCaseTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (error) {
            console.error('AI Use Case Tags error:', error);
            alert('AI was unable to generate use case tags. Please try again.');
        } finally {
            setIsGeneratingUseCaseTags(false);
        }
    };

    const handleGenerateOccasionTags = async () => {
        if (!title.trim()) {
            alert('Please enter a product title first.');
            return;
        }
        setIsGeneratingOccasionTags(true);
        try {
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            const res = await aiService.generateOccasionTags(title, categoryName);
            if (res && res.length > 0) {
                setOccasionTags(prev => Array.from(new Set([...prev, ...res])));
            }
        } catch (error) {
            console.error('AI Occasion Tags error:', error);
            alert('AI was unable to generate occasion tags. Please try again.');
        } finally {
            setIsGeneratingOccasionTags(false);
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
        setAttributeErrorState(prev => ({ ...prev, [attributeId]: '' }));

        try {
            const options = await fetchAttributeOptions(attributeId);
            setAttributeOptionsMap(prev => ({
                ...prev,
                [attributeId]: options
            }));
        } catch (error) {
            console.error(`Error loading options for attribute ${attributeId}:`, error);
            setAttributeErrorState(prev => ({ ...prev, [attributeId]: 'Failed to load options' }));
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
        // More robust validation
        if (!categoryId || !categoryId.trim()) {
            alert('Please select a category for your product.');
            return;
        }

        if (!title || !title.trim()) {
            alert('Please enter a product title.');
            return;
        }

        // Check for simple product pricing
        if (!hasVariants && (basePrice === undefined || basePrice === null || basePrice < 0)) {
            alert('Please set a valid price for your product.');
            return;
        }

        // Check for variant pricing (at least one variant must have a price)
        if (hasVariants && (!variants || variants.length === 0 || !variants.some(v => v.price > 0))) {
            alert('Please set prices for at least one product variant.');
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
                    value_text: pricingUnit
                };

                if (existingIdx >= 0) {
                    finalAttributes[existingIdx] = attrObj;
                } else {
                    finalAttributes.push(attrObj);
                }
            }

            const payload = {
                title,
                description,
                category_id: categoryId,
                brand_id: brandId || undefined,
                currency: currency,
                sale_unit: pricingUnit,
                free_delivery: freeDelivery,
                delivery_scope: deliveryScope,
                delivery_locations: deliveryLocations,
                min_order_value: Number.isFinite(minOrderValue) ? minOrderValue : 0,
                min_order_for_free_delivery: Number.isFinite(minOrderForFreeDelivery) ? minOrderForFreeDelivery : 0,
                is_express_delivery: isExpressDelivery,
                delay_credit: Number.isFinite(delayCredit) ? delayCredit : 0,
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
                attributes: finalAttributes,
                variants: preparedVariants,
                media: allMedia.map((m, i) => ({ ...m, position: i })),
                listing_type: listingType,
                condition: condition
            };

            const pid = await createProductFull(
                sellerId,
                payload,
                payload.variants,
                payload.media,
                payload.attributes,
                quantityDiscounts
            );

            if (pid) {

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
                                    <SearchableSelect
                                        label="Vertical *"
                                        options={verticals}
                                        value={selectedVertical}
                                        onChange={(val) => setSelectedVertical(val)}
                                        placeholder="Select Vertical"
                                        loading={isLoadingVerticals}
                                        error={errorVerticals || undefined}
                                        onRetry={loadVerticalsAction}
                                    />
                                </div>
                                <div>
                                    <SearchableSelect
                                        label="Category *"
                                        options={categories}
                                        value={categoryId}
                                        onChange={(val) => setCategoryId(val)}
                                        disabled={!selectedVertical}
                                        placeholder={selectedVertical ? "Select Category" : "Select Vertical First"}
                                        error={errorCategories || undefined}
                                        onRetry={() => loadCategoriesAction(selectedVertical)}
                                    />
                                </div>
                            </div>

                            {/* Product Details */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Product Title *</label>
                                    <button
                                        type="button"
                                        onClick={handleImproveTitle}
                                        disabled={isImprovingTitle || !title.trim()}
                                        className="text-orange-600 text-xs font-semibold flex items-center gap-1 hover:text-orange-700 disabled:opacity-50"
                                    >
                                        <span className={`material-icons text-sm ${isImprovingTitle ? 'animate-spin' : ''}`}>
                                            {isImprovingTitle ? 'autorenew' : 'auto_awesome'}
                                        </span>
                                        {isImprovingTitle ? 'Improving...' : 'AI Improve'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="e.g. Nike Air Max 2023"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDescription}
                                        disabled={isGeneratingDescription || !title.trim()}
                                        className="text-orange-600 text-xs font-semibold flex items-center gap-1 hover:text-orange-700 disabled:opacity-50"
                                    >
                                        <span className={`material-icons text-sm ${isGeneratingDescription ? 'animate-spin' : ''}`}>
                                            {isGeneratingDescription ? 'autorenew' : 'auto_awesome'}
                                        </span>
                                        {isGeneratingDescription ? 'Generating...' : 'AI Write'}
                                    </button>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Describe your product..."
                                />
                            </div>

                            {/* Brand Selection - Enhanced with trickle down */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <SearchableSelect
                                        label="Brand"
                                        options={brands}
                                        value={brandId}
                                        onChange={(val) => setBrandId(val)}
                                        disabled={!categoryId}
                                        placeholder={categoryId ? "Search Brand..." : "Select Category First"}
                                        error={errorBrands || undefined}
                                        onRetry={() => loadCategoryDetailsAction(categoryId)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Condition *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'new', label: 'New', color: 'orange' },
                                            { id: 'used', label: 'Used', color: 'blue' },
                                            { id: 'refurbished', label: 'Refurbished', color: 'emerald' },
                                            { id: 'open_box', label: 'Open Box', color: 'purple' },
                                            { id: 'digital', label: 'Digital', color: 'gray' }
                                        ].map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setCondition(c.id as any)}
                                                className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${condition === c.id
                                                    ? `border-${c.color}-500 bg-${c.color}-50 text-${c.color}-700`
                                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="text-[10px] font-bold uppercase tracking-tight">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sections removed (Promotions & Shipping) - moved to Pricing & Delivery step */}

                            <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900">SEO Settings (Optional)</h3>
                                    <button
                                        type="button"
                                        onClick={handleGenerateSEO}
                                        disabled={isGeneratingSEO || !title.trim()}
                                        className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        <span className={`material-icons text-sm ${isGeneratingSEO ? 'animate-spin' : ''}`}>
                                            {isGeneratingSEO ? 'refresh' : 'auto_awesome'}
                                        </span>
                                        {isGeneratingSEO ? 'Generating...' : 'AI Generate SEO'}
                                    </button>
                                </div>
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
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700">Tags</label>
                                            <button
                                                type="button"
                                                onClick={handleGenerateTags}
                                                disabled={isGeneratingTags || !title.trim()}
                                                className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-full transition-colors"
                                            >
                                                <span className={`material-icons text-sm ${isGeneratingTags ? 'animate-spin' : ''}`}>
                                                    {isGeneratingTags ? 'refresh' : 'auto_awesome'}
                                                </span>
                                                {isGeneratingTags ? 'Generating...' : 'AI Generate Tags'}
                                            </button>
                                        </div>
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

                                {/* Product Type Selection - Moved from Step 3 */}
                                <div className="pt-6 border-t border-gray-100 animate-fade-in">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <span className="material-icons text-lg">inventory_2</span>
                                            Product Type
                                        </h4>
                                        <p className="text-sm text-blue-700 mb-4">Choose how you'll sell this product. You can change this later if needed.</p>

                                        <div className="flex items-center gap-4">
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

                                        <div className="mt-3 p-3 bg-white rounded border">
                                            {!hasVariants ? (
                                                <div className="text-sm text-gray-600">
                                                    <strong>Simple Product:</strong> Single price and stock level. Best for products without variations (e.g., a single book, toy, or accessory).
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-600">
                                                    <strong>Multiple Variants:</strong> Different prices and stock for variations (e.g., different sizes, colors). Each combination becomes a separate purchasable item.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Purchase Mode / Listing Type */}
                                <div className="pt-8 border-t border-gray-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Purchase Mode</h3>
                                        <div className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black uppercase rounded tracking-tighter">Required</div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                    "relative flex flex-col p-4 rounded-xl border-2 transition-all text-left group overflow-hidden",
                                                    listingType === mode.id
                                                        ? `border-${mode.color}-300 bg-${mode.color}-50/50 shadow-sm`
                                                        : "border-gray-100 bg-white hover:border-gray-200"
                                                )}
                                            >
                                                {listingType === mode.id && (
                                                    <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${mode.color}-500 animate-pulse`} />
                                                )}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors",
                                                    listingType === mode.id ? `bg-${mode.color}-500 text-white` : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                                                )}>
                                                    <span className="material-icons text-xl">{mode.icon}</span>
                                                </div>
                                                <div className={cn("font-bold text-sm", listingType === mode.id ? `text-${mode.color}-900` : "text-gray-900")}>{mode.title}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black mt-1 leading-tight">{mode.desc}</div>
                                            </button>
                                        ))}
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
                                                        onRetry={() => loadAttributeOptions(attr.id)}
                                                        error={attributeErrorState[attr.id]}
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
                                    <p className="text-sm text-gray-500">
                                        {hasVariants
                                            ? "Configure pricing and stock for each variant combination."
                                            : "Set pricing and stock for your simple product."
                                        }
                                    </p>
                                </div>
                                <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <span className="text-sm font-medium text-blue-800">
                                        Product Type: <span className="font-bold">{hasVariants ? 'Multiple Variants' : 'Simple Product'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Global Currency & Unit Selection - Always visible */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <span className="material-icons text-lg">attach_money</span>
                                    Currency & Pricing Unit
                                </h4>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Currency</label>
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full bg-white border border-blue-200 text-xs font-bold rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                                        >
                                            {SUPPORTED_CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Pricing Unit</label>
                                        <select
                                            value={pricingUnit}
                                            onChange={e => setPricingUnit(e.target.value)}
                                            className="w-full bg-white border border-blue-200 text-xs font-bold rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                                        >
                                            {['piece', 'kg', 'g', 'L', 'ml', 'meter', 'box', 'pack', 'pair', 'dozen'].map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {!hasVariants ? (
                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 animate-fade-in">
                                    <h3 className="font-semibold text-gray-900 mb-4">Standard Pricing</h3>

                                    {/* Price Inputs */}
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

                                        <div className="md:col-span-3 pt-4 border-t border-orange-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Bulk Wholesale Tiers</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Reward buyers for larger quantities</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setQuantityDiscounts([...quantityDiscounts, { min_quantity: 0, unit_price: 0 }])}
                                                    className="text-orange-600 text-[10px] font-black uppercase flex items-center gap-1 hover:underline bg-orange-100/50 px-2 py-1 rounded"
                                                >
                                                    <span className="material-icons text-xs">add</span>
                                                    Add Tier
                                                </button>
                                            </div>

                                            {quantityDiscounts.length > 0 ? (
                                                <div className="space-y-3">
                                                    {quantityDiscounts.map((tier, idx) => (
                                                        <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-orange-100 animate-in slide-in-from-left-2 transition-all shadow-sm">
                                                            <div className="flex-1">
                                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Min. Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    value={tier.min_quantity}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...quantityDiscounts];
                                                                        newTiers[idx].min_quantity = parseInt(e.target.value) || 0;
                                                                        setQuantityDiscounts(newTiers);
                                                                    }}
                                                                    placeholder="e.g. 50"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Wholesale price ({currencySymbol})</label>
                                                                <input
                                                                    type="number"
                                                                    value={tier.unit_price}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...quantityDiscounts];
                                                                        newTiers[idx].unit_price = parseFloat(e.target.value) || 0;
                                                                        setQuantityDiscounts(newTiers);
                                                                    }}
                                                                    placeholder="e.g. 45"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-500 font-bold text-orange-600"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuantityDiscounts(quantityDiscounts.filter((_, i) => i !== idx))}
                                                                className="mt-5 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                                title="Remove tier"
                                                            >
                                                                <span className="material-icons text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100 mt-2">
                                                        <span className="material-icons text-blue-500 text-xs">info</span>
                                                        <p className="text-[9px] text-blue-700 font-bold uppercase tracking-tight">Buyers will see these tiers on the product page</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 border-2 border-dashed border-orange-100 rounded-xl bg-orange-50/30">
                                                    <span className="material-icons text-orange-200 text-2xl mb-1">sell</span>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">No bulk pricing tiers added</p>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={typeof baseCompareAtPrice === 'number' ? baseCompareAtPrice : ''}
                                                    onChange={(e) => setBaseCompareAtPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                    placeholder="Anchor price"
                                                />
                                            </div>
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

                            {/* Delivery & Shipping Section - Moved from Step 0 */}
                            <div className="pt-8 border-t border-gray-100 animate-fade-in mt-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <span className="material-icons text-orange-600">local_shipping</span>
                                    Delivery & Shipping
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400">
                                                <span className="material-icons text-sm">schedule</span>
                                            </span>
                                            <select
                                                value={deliveryTime}
                                                onChange={(e) => setDeliveryTime(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                                            >
                                                <option value="">Select Estimate</option>
                                                <option value="1-2 days">1-2 Days</option>
                                                <option value="3-5 days">3-5 Days</option>
                                                <option value="7-10 days">7-10 Days</option>
                                                <option value="2 weeks+">2 Weeks+</option>
                                            </select>
                                            <span className="absolute right-3 top-2.5 material-icons text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
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
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delay Credit</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                value={delayCredit}
                                                onChange={(e) => setDelayCredit(parseFloat(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="0.00"
                                                min={0}
                                                step="0.01"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">Credit given for delivery delays</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Minimum Order Value</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">Prevent low-value orders</p>
                                        </div>
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{getCurrencySymbol(currency)}</span>
                                            <input
                                                type="number"
                                                value={minOrderValue}
                                                onChange={e => setMinOrderValue(parseFloat(e.target.value) || 0)}
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Free Delivery Threshold</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">Waive cost above this amount</p>
                                        </div>
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{getCurrencySymbol(currency)}</span>
                                            <input
                                                type="number"
                                                value={minOrderForFreeDelivery}
                                                onChange={e => setMinOrderForFreeDelivery(parseFloat(e.target.value) || 0)}
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-7 pr-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest px-1">Delivery Scope</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {DELIVERY_SCOPE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryScope(opt.value);
                                                    if (opt.value === 'nationwide') setDeliveryLocations([]);
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                                                    deliveryScope === opt.value
                                                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                                                        : "border-gray-200 bg-white hover:border-gray-300"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                        deliveryScope === opt.value ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                                                    )}>
                                                        <span className="material-icons text-xl">
                                                            {opt.value === 'nationwide' ? 'public' : opt.value === 'regional' ? 'map' : 'location_on'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className={cn("font-bold text-sm", deliveryScope === opt.value ? "text-orange-900" : "text-gray-900")}>{opt.label}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase font-medium line-clamp-1">{opt.detail}</div>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                                    deliveryScope === opt.value ? "border-orange-500" : "border-gray-300"
                                                )}>
                                                    {deliveryScope === opt.value && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {deliveryScope !== 'nationwide' && (
                                        <div className="mt-4 p-5 bg-orange-50/50 border border-orange-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                                {deliveryScope === 'regional' ? 'Target Regions' : 'Specific Locations / Cities'}
                                            </label>

                                            {deliveryScope === 'regional' ? (
                                                /* Modern searchable region multi-select for regional scope */
                                                <RegionMultiSelect
                                                    selectedRegions={deliveryLocations}
                                                    onChange={setDeliveryLocations}
                                                    placeholder="Search and select target regions..."
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
                                                            placeholder="Add city or radius (e.g. Nairobi CBD, 10km)"
                                                            className="flex-1 border-none bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (deliveryLocationInput.trim()) {
                                                                    setDeliveryLocations(prev => [...new Set([...prev, deliveryLocationInput.trim()])]);
                                                                    setDeliveryLocationInput('');
                                                                }
                                                            }}
                                                            className="bg-orange-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-all text-sm font-bold"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {deliveryLocations.map(loc => (
                                                            <div key={loc} className="bg-white text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm border border-orange-100 group">
                                                                {loc}
                                                                <span
                                                                    className="material-icons text-[16px] cursor-pointer text-gray-300 group-hover:text-red-500 transition-colors"
                                                                    onClick={() => setDeliveryLocations(prev => prev.filter(l => l !== loc))}
                                                                >
                                                                    cancel
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", freeDelivery ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
                                                <span className="material-icons">task_alt</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Free Delivery</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-medium">Waive cost above threshold</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFreeDelivery(!freeDelivery)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${freeDelivery ? 'bg-orange-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`${freeDelivery ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isExpressDelivery ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400")}>
                                                <span className="material-icons">bolt</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Express Shipping</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-medium">Faster than standard shipping</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsExpressDelivery(!isExpressDelivery)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isExpressDelivery ? 'bg-orange-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`${isExpressDelivery ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">SEO & Discovery</h2>
                                    <p className="text-sm text-gray-500">How buyers find your product through search and browsing.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGenerateSEO}
                                    disabled={isGeneratingSEO}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold border border-purple-100 hover:bg-purple-100 transition-all disabled:opacity-50"
                                >
                                    <span className="material-icons text-sm">{isGeneratingSEO ? 'autorenew' : 'auto_awesome'}</span>
                                    {isGeneratingSEO ? 'Generating...' : 'Auto-Generate SEO'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">Search Meta Data</h3>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Meta Title</label>
                                            <input
                                                type="text"
                                                value={seoTitle}
                                                onChange={(e) => setSeoTitle(e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                                                placeholder="Search engine title"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Meta Description</label>
                                            <textarea
                                                value={metaDescription}
                                                onChange={(e) => setMetaDescription(e.target.value)}
                                                rows={3}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium resize-none"
                                                placeholder="Brief summary for search results..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Product Slug (URL)</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-mono">/product/</span>
                                                <input
                                                    type="text"
                                                    value={slug}
                                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                                                    placeholder="product-name-slug"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Discovery Tags</h3>
                                            <button
                                                type="button"
                                                onClick={handleGenerateTags}
                                                disabled={isGeneratingTags}
                                                className="text-[10px] font-bold text-purple-600 uppercase tracking-tighter hover:underline"
                                            >
                                                {isGeneratingTags ? 'Generating...' : 'Magic Tags'}
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), tagInput.trim() && (setTags([...new Set([...tags, tagInput.trim()])]), setTagInput('')))}
                                                placeholder="Add tag..."
                                                className="flex-1 border border-gray-100 bg-gray-50 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tags.map(tag => (
                                                <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5">
                                                    #{tag}
                                                    <span className="material-icons text-[12px] cursor-pointer hover:text-red-500" onClick={() => setTags(tags.filter(t => t !== tag))}>close</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 shadow-sm space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold text-purple-700 uppercase tracking-widest px-1">Use Case Tags</label>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateUseCaseTags}
                                                    disabled={isGeneratingUseCaseTags}
                                                    className="text-[10px] font-bold text-purple-600 uppercase hover:underline"
                                                >
                                                    {isGeneratingUseCaseTags ? '...' : 'AI Suggest'}
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={useCaseInput}
                                                    onChange={e => setUseCaseInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), useCaseInput.trim() && (setUseCaseTags([...new Set([...useCaseTags, useCaseInput.trim()])]), setUseCaseInput('')))}
                                                    placeholder="e.g. Office, Hiking"
                                                    className="flex-1 border-none bg-white rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {useCaseTags.map(tag => (
                                                    <span key={tag} className="bg-white text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-100 shadow-sm flex items-center gap-1.5">
                                                        {tag}
                                                        <span className="material-icons text-[12px] cursor-pointer" onClick={() => setUseCaseTags(useCaseTags.filter(t => t !== tag))}>close</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold text-purple-700 uppercase tracking-widest px-1">Occasion Tags</label>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateOccasionTags}
                                                    disabled={isGeneratingOccasionTags}
                                                    className="text-[10px] font-bold text-purple-600 uppercase hover:underline"
                                                >
                                                    {isGeneratingOccasionTags ? '...' : 'AI Suggest'}
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={occasionInput}
                                                    onChange={e => setOccasionInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), occasionInput.trim() && (setOccasionTags([...new Set([...occasionTags, occasionInput.trim()])]), setOccasionInput('')))}
                                                    placeholder="e.g. Wedding, Birthday"
                                                    className="flex-1 border-none bg-white rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {occasionTags.map(tag => (
                                                    <span key={tag} className="bg-white text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-100 shadow-sm flex items-center gap-1.5">
                                                        {tag}
                                                        <span className="material-icons text-[12px] cursor-pointer" onClick={() => setOccasionTags(occasionTags.filter(t => t !== tag))}>close</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                                        <h3 className="text-sm font-bold text-orange-900 uppercase mb-4">Final Summary</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold">Standard Price</span>
                                                <span className="font-bold text-gray-900">{currencySymbol}{basePrice} {currency}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold">Delivery Cost</span>
                                                <span className="font-bold {deliveryCost === 0 ? 'text-green-600' : 'text-gray-900'}">
                                                    {deliveryCost === 0 ? 'FREE' : `${currencySymbol}${deliveryCost}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold">Scope</span>
                                                <span className="font-bold text-gray-900 uppercase italic">{deliveryScope}</span>
                                            </div>
                                            {deliveryLocations.length > 0 && (
                                                <div className="text-[10px] text-orange-700 font-bold border-t border-orange-100 pt-2">
                                                    Targets: {deliveryLocations.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                                onClick={(e) => { e.stopPropagation(); setActiveVideoPreview(null); }}
                                className="absolute -top-10 right-0 text-white hover:text-gray-300"
                            >
                                <span className="material-icons text-3xl">close</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Sticky Actions */}
                <div className="fixed bottom-0 right-0 ml-64 bg-white border-t border-gray-200 p-4 z-50 left-0">
                    <div className="max-w-4xl mx-auto flex justify-between items-center px-6">
                        <button
                            onClick={currentStep === 0 ? onCancel : () => setCurrentStep(prev => prev - 1)}
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
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                className="px-8 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                Next
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddProductView;
