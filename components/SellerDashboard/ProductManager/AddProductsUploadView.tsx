
import React, { useState, useRef } from 'react';
import { CSVParser, ParsedRow } from '../../../lib/csv-parser';
import { createProductsBulk, fetchVerticals, fetchCategories, fetchBrands } from '../../../lib/api';
import { CreateProductPayload, ShopifyVertical, ShopifyCategory, ShopifyBrand } from '../../../types';
import { useEffect } from 'react';

interface AddProductsUploadViewProps {
    sellerId: string;
}

const AddProductsUploadView: React.FC<AddProductsUploadViewProps> = ({ sellerId }) => {
    const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download');
    const [category, setCategory] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        success: string[];
        failed: { index: number; error: string }[];
    } | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
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
                // This might be slow if many categories, but safe for initial implementation
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
        // If it looks like a UUID, return as is
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
        setUploadStatus(null);
        setProgress({ current: 0, total: 0 });

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            try {
                const delimiter = CSVParser.detectDelimiter(content);
                const result = CSVParser.parse(content, delimiter);

                if (result.errors.length > 0) {
                    alert('Errors in CSV: ' + result.errors.join(', '));
                    setIsUploading(false);
                    return;
                }

                // Map CSV rows to CreateProductPayload
                const productsToCreate = result.data.map((row: ParsedRow, index: number) => {
                    // Extract attributes
                    const attributes: any[] = [];
                    if (row['attributes']) {
                        const pairs = row['attributes'].split('|');
                        pairs.forEach(pair => {
                            const [key, value] = pair.split(':');
                            if (key && value) {
                                attributes.push({
                                    name: key.trim(),
                                    value: value.trim(),
                                    attribute_id: '', // Will be handled by backend if custom
                                    is_custom: true
                                });
                            }
                        });
                    }

                    // Extract SEO and other arrays
                    const seoKeywords = row['seo_keywords'] ? row['seo_keywords'].split(',').map(s => s.trim()) : [];
                    const deliveryLocations = row['delivery_locations'] ? row['delivery_locations'].split(',').map(s => s.trim()) : [];
                    const tags = row['tags'] ? row['tags'].split(',').map(s => s.trim()) : [];
                    const useCaseTags = row['use_case_tags'] ? row['use_case_tags'].split(',').map(s => s.trim()) : [];
                    const occasionTags = row['occasion_tags'] ? row['occasion_tags'].split(',').map(s => s.trim()) : [];

                    // Extract media
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

                    // Extract quantity discounts
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
                        sale_unit: row['sale_unit'] || row['pricing_unit'] || 'piece',
                        seo_title: row['seo_title'] || '',
                        meta_description: row['meta_description'] || '',
                        url_slug: row['url_slug'] || '',
                        canonical_url: row['canonical_url'] || '',
                        seo_keywords: row['seo_keywords'] || '',
                        free_delivery: row['free_delivery'] === 'true',
                        delivery_scope: row['delivery_scope'] || 'nationwide',
                        delivery_cost: parseFloat(row['delivery_cost'] || '0'),
                        delivery_time_estimate: row['delivery_time_estimate'] || row['delivery_time'] || '',
                        delivery_time_days: parseInt(row['delivery_time_days'] || '1'),
                        is_express_delivery: row['is_express_delivery'] === 'true',
                        min_order_value: parseFloat(row['min_order_value'] || '0'),
                        min_order_for_free_delivery: parseFloat(row['min_order_for_free_delivery'] || '0'),
                        delivery_locations: deliveryLocations,
                        tags: tags,
                        use_case_tags: useCaseTags,
                        occasion_tags: occasionTags,
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
                        quantityDiscounts: payload.quantity_discounts
                    };
                });

                if (productsToCreate.length === 0) {
                    alert('No valid products found in CSV.');
                    setIsUploading(false);
                    return;
                }

                const results = await createProductsBulk(sellerId, productsToCreate, (curr, tot) => {
                    setProgress({ current: curr, total: tot });
                });

                setUploadStatus(results);
            } catch (error: any) {
                alert('Failed to parse or upload CSV: ' + error.message);
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Add products via upload</h1>
                    <a href="#" className="text-orange-500 hover:text-orange-600 text-sm font-medium hover:underline">
                        How to add product in bulk
                    </a>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('download')}
                        className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'download' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Download spreadsheet
                        {activeTab === 'download' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'upload' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Upload your spreadsheet
                        {activeTab === 'upload' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white p-8 min-h-[400px] border border-gray-200 rounded-xl">
                {activeTab === 'download' && (
                    <div className="max-w-4xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Download spreadsheet</h2>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Please enter category"
                                    className="w-full border border-gray-300 rounded px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                />
                                <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">expand_more</span>
                            </div>
                        </div>

                        <div className="flex justify-center mt-12">
                            <button
                                onClick={handleDownloadTemplate}
                                className="bg-orange-500 text-white px-12 py-2.5 rounded font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                Generate spreadsheet
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="max-w-4xl mx-auto text-center py-12">
                        {isUploading ? (
                            <div className="space-y-6">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                                <h3 className="text-lg font-medium text-gray-900">Uploading products...</h3>
                                <p className="text-sm text-gray-500">
                                    Progress: {progress.current} / {progress.total}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
                                    <div
                                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : uploadStatus ? (
                            <div className="space-y-6">
                                <div className={`inline-flex items-center justify-center p-3 rounded-full ${uploadStatus.failed.length === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                    <span className={`material-icons ${uploadStatus.failed.length === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {uploadStatus.failed.length === 0 ? 'check_circle' : 'warning'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Upload Complete</h3>
                                <div className="text-sm text-gray-600">
                                    <p className="text-green-600 font-bold">Successfully created: {uploadStatus.success.length}</p>
                                    <p className="text-red-600 font-bold">Failed: {uploadStatus.failed.length}</p>
                                </div>
                                {uploadStatus.failed.length > 0 && (
                                    <div className="text-left bg-red-50 p-4 rounded-lg max-h-40 overflow-y-auto max-w-2xl mx-auto">
                                        <p className="text-xs font-bold text-red-700 mb-2">Errors:</p>
                                        <ul className="text-xs text-red-600 space-y-1">
                                            {uploadStatus.failed.map((f, i) => (
                                                <li key={i}>Row {f.index + 1}: {f.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button
                                    onClick={() => setUploadStatus(null)}
                                    className="bg-orange-500 text-white px-8 py-2 rounded font-bold hover:bg-orange-600"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-12 hover:bg-gray-100 transition-colors cursor-pointer inline-block w-full max-w-2xl group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".csv,.tsv"
                                    className="hidden"
                                />
                                <span className="material-icons text-5xl text-gray-400 mb-4 group-hover:text-orange-500 transition-colors">cloud_upload</span>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Drag and drop your spreadsheet here</h3>
                                <p className="text-sm text-gray-500 mb-6">Supported formats: .csv, .tsv</p>
                                <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-50">
                                    Select File
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddProductsUploadView;

