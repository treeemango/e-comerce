import React, { useState, useRef, useEffect } from 'react';
import { CSVParser, ParsedRow } from '@/lib/csv-parser';
import { createProductsBulk, fetchVerticals, fetchCategories, fetchBrands } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ShopifyCategory, ShopifyBrand } from '@/types';

interface SellerBulkUploadSheetProps {
    sellerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const SellerBulkUploadSheet: React.FC<SellerBulkUploadSheetProps> = ({
    sellerId,
    onClose,
    onSuccess
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<ShopifyCategory[]>([]);
    const [allBrands, setAllBrands] = useState<ShopifyBrand[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial data fetch for resolution maps
    useEffect(() => {
        const loadResolutionData = async () => {
            try {
                // Fetch all verticals first to get categories
                const verticals = await fetchVerticals();
                const categoryPromises = verticals.map(v => fetchCategories(v.id));
                const categoriesSubsets = await Promise.all(categoryPromises);
                const categories = categoriesSubsets.flat();
                setAllCategories(categories);

                // For brands, fetch for each category
                const brandPromises = categories.map(c => fetchBrands(c.id));
                const brandsSubsets = await Promise.all(brandPromises);
                const brands = brandsSubsets.flat();
                setAllBrands(brands);
            } catch (err) {
                console.error('Failed to load resolution data:', err);
            }
        };

        loadResolutionData();
    }, []);

    const findBestMatch = (input: string, options: { id: string; name: string }[]) => {
        const normalInput = input.toLowerCase().trim();
        if (!normalInput) return null;

        // 1. Exact match
        const exact = options.find(o => o.name.toLowerCase() === normalInput);
        if (exact) return exact;

        // 2. Starts with / Contains
        const partial = options.find(o =>
            o.name.toLowerCase().includes(normalInput) ||
            normalInput.includes(o.name.toLowerCase())
        );
        if (partial) return partial;

        // 3. Word-based match (e.g., "Electrical Items" vs "Electronics")
        const inputWords = normalInput.split(/\s+/).filter(w => w.length > 2);
        if (inputWords.length > 0) {
            const wordMatch = options.find(o => {
                const lowerName = o.name.toLowerCase();
                return inputWords.some(word => lowerName.includes(word));
            });
            if (wordMatch) return wordMatch;
        }

        return null;
    };

    const resolveCategoryId = (nameOrId: string) => {
        if (!nameOrId) return '';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(nameOrId)) return nameOrId;

        const bestMatch = findBestMatch(nameOrId, allCategories);
        return bestMatch ? bestMatch.id : nameOrId;
    };

    const resolveBrandId = (nameOrId: string) => {
        if (!nameOrId) return '';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(nameOrId)) return nameOrId;

        const bestMatch = findBestMatch(nameOrId, allBrands);
        return bestMatch ? bestMatch.id : nameOrId;
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'title', 'description', 'category_id', 'brand_id', 'condition', 'listing_type',
            'price', 'compare_at_price', 'currency', 'stock', 'sku', 'sale_unit',
            'image_url', 'additional_images', 'video_url',
            'seo_title', 'meta_description', 'url_slug', 'canonical_url', 'seo_keywords',
            'free_delivery', 'delivery_scope', 'delivery_cost', 'delivery_time_estimate', 'delivery_time_days', 'is_express_delivery',
            'min_order_value', 'min_order_for_free_delivery', 'delivery_locations',
            'tags', 'use_case_tags', 'occasion_tags', 'attributes', 'quantity_discounts'
        ];

        const sampleData = [
            [
                'Sample Product', 'A great product description', 'electronics', 'sony', 'new', 'direct_purchase',
                '99.99', '129.99', 'USD', '100', 'SKU001', 'piece',
                'https://example.com/image.jpg', 'https://example.com/image2.jpg,https://example.com/image3.jpg', 'https://youtube.com/watch?v=123',
                'Sample SEO Title', 'Meta description for SEO', 'sample-product', 'https://example.com/sample-product', 'keyword1,keyword2',
                'true', 'nationwide', '0', '3-5 days', '3', 'false',
                '0', '50', 'USA,Canada',
                'electronics,gadget', 'home-office', 'gift', 'Color:Black|Material:Plastic', '5:89.99|10:79.99'
            ]
        ];

        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'bulk_upload_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setProgress({ current: 0, total: 0 });

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            try {
                const result = CSVParser.parse(content);
                if (result.errors.length > 0) {
                    setError(`Parsing error: ${result.errors[0]}`);
                    setIsUploading(false);
                    return;
                }

                const productsToCreate = result.data.map((row: ParsedRow, index: number) => {
                    const attributes: any[] = [];
                    if (row['attributes']) {
                        const pairs = row['attributes'].split('|');
                        pairs.forEach(pair => {
                            const [key, value] = pair.split(':');
                            if (key && value) {
                                attributes.push({
                                    name: key.trim(),
                                    value: value.trim(),
                                    attribute_id: '',
                                    is_custom: true
                                });
                            }
                        });
                    }

                    const additionalImages = row['additional_images'] ? row['additional_images'].split(',').map(s => s.trim()) : [];
                    const allImages = [row['image_url'], ...additionalImages].filter(Boolean);

                    const media: any[] = allImages.map((url, idx) => ({
                        url,
                        storage_path: '',
                        media_type: 'image',
                        is_main: idx === 0,
                        position: idx
                    }));

                    if (row['video_url']) {
                        media.push({
                            url: row['video_url'],
                            storage_path: '',
                            media_type: row['video_url'].includes('youtube.com') || row['video_url'].includes('youtu.be') ? 'youtube' : 'video',
                            is_main: false,
                            position: media.length
                        });
                    }

                    const quantityDiscounts: any[] = [];
                    if (row['quantity_discounts']) {
                        const pairs = row['quantity_discounts'].split('|');
                        pairs.forEach(pair => {
                            const [qty, price] = pair.split(':');
                            if (qty && price) {
                                quantityDiscounts.push({
                                    min_quantity: parseInt(qty.trim()),
                                    unit_price: parseFloat(price.trim())
                                });
                            }
                        });
                    }

                    const payload: any = {
                        title: row['title'] || `Product ${index + 1}`,
                        description: row['description'] || '',
                        category_id: resolveCategoryId(row['category_id'] || ''),
                        brand_id: resolveBrandId(row['brand_id'] || ''),
                        currency: row['currency'] || 'USD',
                        condition: row['condition'] || 'new',
                        listing_type: row['listing_type'] || 'direct_purchase',
                        sale_unit: row['sale_unit'] || 'piece',
                        seo_title: row['seo_title'] || '',
                        meta_description: row['meta_description'] || '',
                        url_slug: row['url_slug'] || '',
                        canonical_url: row['canonical_url'] || '',
                        seo_keywords: row['seo_keywords'] || '',
                        free_delivery: row['free_delivery'] === 'true',
                        delivery_scope: row['delivery_scope'] || 'nationwide',
                        delivery_cost: parseFloat(row['delivery_cost'] || '0'),
                        delivery_time_estimate: row['delivery_time_estimate'] || '',
                        delivery_time_days: parseInt(row['delivery_time_days'] || '1'),
                        is_express_delivery: row['is_express_delivery'] === 'true',
                        min_order_value: parseFloat(row['min_order_value'] || '0'),
                        min_order_for_free_delivery: parseFloat(row['min_order_for_free_delivery'] || '0'),
                        delivery_locations: row['delivery_locations'] ? row['delivery_locations'].split(',').map(s => s.trim()) : [],
                        tags: row['tags'] ? row['tags'].split(',').map(s => s.trim()) : [],
                        use_case_tags: row['use_case_tags'] ? row['use_case_tags'].split(',').map(s => s.trim()) : [],
                        occasion_tags: row['occasion_tags'] ? row['occasion_tags'].split(',').map(s => s.trim()) : [],
                        attributes,
                        variants: [{
                            sku: row['sku'] || '',
                            price: parseFloat(row['price'] || '0'),
                            compare_at_price: parseFloat(row['compare_at_price'] || row['price'] || '0'),
                            stock: parseInt(row['stock'] || '0'),
                            options: {},
                            is_default: true,
                            image_url: row['image_url'] || ''
                        }],
                        media,
                        quantity_discounts: quantityDiscounts
                    };

                    return {
                        payload,
                        variants: payload.variants,
                        media: payload.media,
                        attributes: payload.attributes,
                        quantityDiscounts: payload.quantityDiscounts
                    };
                });

                const results = await createProductsBulk(sellerId, productsToCreate, (curr, tot) => {
                    setProgress({ current: curr, total: tot });
                });

                if (results.failed.length > 0) {
                    setError(`Failed to upload ${results.failed.length} products. Check console for details.`);
                    console.error('Bulk upload failures:', results.failed);
                } else {
                    onSuccess();
                    onClose();
                }
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred');
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isUploading ? onClose : undefined} />

            {/* Sheet */}
            <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Bulk Upload</h2>
                        <p className="text-sm text-gray-500 font-medium">Add multiple products via CSV</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400"
                    >
                        <span className="material-icons text-xl">close</span>
                    </button>
                </div>

                {isUploading ? (
                    <div className="py-12 flex flex-col items-center">
                        <div className="relative w-24 h-24 mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-gray-100 dark:text-gray-800"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={251.2}
                                    strokeDashoffset={251.2 - (251.2 * (progress.current / (progress.total || 1)))}
                                    className="text-primary transition-all duration-300"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-gray-900 dark:text-white">
                                    {Math.round((progress.current / (progress.total || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">Uploading products...</p>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">
                            {progress.current} of {progress.total} completed
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
                                <span className="material-icons text-red-500 text-lg">error_outline</span>
                                <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full p-6 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-3xl flex items-center gap-4 group active:scale-[0.98] transition-all"
                            >
                                <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-orange-500 shadow-md">
                                    <span className="material-icons text-2xl">download</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Download Template</h3>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Example CSV spreadsheet</p>
                                </div>
                                <span className="material-icons text-gray-300 dark:text-gray-700 ml-auto group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-6 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-3xl flex items-center gap-4 group active:scale-[0.98] transition-all"
                            >
                                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                                    <span className="material-icons text-2xl">file_upload</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Upload Spreadsheet</h3>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Pick CSV or TSV file</p>
                                </div>
                                <span className="material-icons text-gray-300 dark:text-gray-700 ml-auto group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.tsv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                                    <span className="material-icons text-sm">info</span>
                                </span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Tips</span>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    'Ensure category IDs match existing categories',
                                    'Image URLs must be direct public links',
                                    'Pricing should not include currency symbols',
                                    'Separate multiple tags with commas'
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
