
import React, { useState, useEffect } from 'react';
import { fetchFilteredProducts, updateProductDetails } from '../../../lib/api';
import { Product, ProductStatus } from '../../../types';
import QuickEditModal, { ProductUpdates } from './QuickEditModal';
import ManageQuantityDiscountsView from './ManageQuantityDiscountsView';

interface ManageProductsViewProps {
    onAddProduct: () => void;
    sellerId: string;
}

type ProductStatusFilter = 'all' | 'archive' | 'inactive' | 'incomplete' | 'draft' | 'deleted';

const statusApiMap: Record<ProductStatusFilter, ProductStatus | 'all'> = {
    all: 'all',
    archive: 'archived',
    inactive: 'inactive',
    incomplete: 'incomplete',
    draft: 'draft',
    deleted: 'deleted'
};

const statusThemes: Record<string, { label: string; badge: string; text: string }> = {
    approved: { label: 'Active', badge: 'bg-green-100 text-green-800', text: 'text-green-800' },
    active: { label: 'Active', badge: 'bg-green-100 text-green-800', text: 'text-green-800' },
    archived: { label: 'Archived', badge: 'bg-gray-100 text-gray-800', text: 'text-gray-800' },
    inactive: { label: 'Inactive', badge: 'bg-amber-100 text-amber-800', text: 'text-amber-800' },
    incomplete: { label: 'Incomplete', badge: 'bg-yellow-100 text-yellow-800', text: 'text-yellow-800' },
    draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-800', text: 'text-slate-800' },
    deleted: { label: 'Deleted', badge: 'bg-red-100 text-red-700', text: 'text-red-700' },
};

const ManageProductsView: React.FC<ManageProductsViewProps> = ({ onAddProduct, sellerId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ProductStatusFilter>('all');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isBulkPricingOpen, setIsBulkPricingOpen] = useState(false);
    const [bulkPricingProduct, setBulkPricingProduct] = useState<Product | null>(null);

    const filters: { id: ProductStatusFilter; label: string; hint?: string }[] = [
        { id: 'all', label: 'All', hint: 'Everything you listed' },
        { id: 'archive', label: 'Archive', hint: 'Hidden from buyers' },
        { id: 'inactive', label: 'Inactive', hint: 'Temporarily paused' },
        { id: 'incomplete', label: 'Incomplete', hint: 'Needs data to go live' },
        { id: 'draft', label: 'Draft', hint: 'Work in progress' },
        { id: 'deleted', label: 'Deleted', hint: 'Removed items' },
    ];

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const loadProducts = async () => {
        setIsLoading(true);
        setSelectedProducts([]);
        if (sellerId) {
            const statusValue = statusApiMap[activeFilter];
            const data = await fetchFilteredProducts(searchQuery, {
                category_ids: [],
                brand_ids: [],
                price_min: null,
                price_max: null,
                attributes: {}
            }, sellerId, statusValue === 'all' ? null : statusValue);
            setProducts(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, [sellerId, searchQuery, activeFilter]);

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleSaveProductUpdate = async (productId: string, updates: ProductUpdates) => {
        try {
            await updateProductDetails(productId, updates);
            await loadProducts();
        } catch (error) {
            console.error('Error saving product update:', error);
            throw error;
        }
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.id.toString()));
        }
    };

    const toggleSelectProduct = (productId: string) => {
        if (selectedProducts.includes(productId)) {
            setSelectedProducts(selectedProducts.filter(id => id !== productId));
        } else {
            setSelectedProducts([...selectedProducts, productId]);
        }
    };

    const handleBulkPricing = (product: Product) => {
        setBulkPricingProduct(product);
        setIsBulkPricingOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Manage products</h2>
                <button
                    onClick={onAddProduct}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/30"
                >
                    <span className="material-icons text-sm">add</span>
                    Add new product
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center gap-1">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`flex-1 px-4 py-2 rounded-md text-left transition-colors border ${activeFilter === filter.id
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                            : 'text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-sm opacity-70">label</span>
                            <div className="flex flex-col leading-tight">
                                <span className="text-sm font-semibold">{filter.label}</span>
                                {filter.hint && <span className="text-[11px] text-gray-400">{filter.hint}</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search product name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={products.length > 0 && selectedProducts.length === products.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[300px]">Product name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Units</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading products...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.includes(product.id.toString())}
                                                onChange={() => toggleSelectProduct(product.id.toString())}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const statusKey = (product.status || 'approved').toString();
                                                const theme = statusThemes[statusKey] || { label: statusKey, badge: 'bg-gray-100 text-gray-800' };
                                                return (
                                                    <div>
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${theme.badge}`}>
                                                            {theme.label}
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-1">{formatDate(product.createdAt)}</div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <img src={product.image} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100" />
                                                <p className="text-sm text-gray-900 line-clamp-2">{product.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.categoryName || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{product.stock ?? 0}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-bold">{product.currency || '$'}{product.price}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleEditProduct(product)}
                                                    className="text-orange-600 hover:text-orange-700 text-sm font-bold"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleBulkPricing(product)}
                                                    className="text-gray-500 hover:text-orange-600 text-sm font-bold flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-xs">groups</span>
                                                    Bulk
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingProduct && (
                <QuickEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingProduct(null); }}
                    onSave={handleSaveProductUpdate}
                    product={editingProduct}
                />
            )}
            {isBulkPricingOpen && bulkPricingProduct && (
                <ManageQuantityDiscountsView
                    product={bulkPricingProduct}
                    onClose={() => { setIsBulkPricingOpen(false); setBulkPricingProduct(null); }}
                    onSuccess={() => {
                        setIsBulkPricingOpen(false);
                        setBulkPricingProduct(null);
                        loadProducts();
                    }}
                />
            )}
        </div>
    );
};

export default ManageProductsView;
