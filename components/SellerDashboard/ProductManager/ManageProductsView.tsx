
import React, { useState, useEffect } from 'react';
import { fetchFilteredProducts, updateProductDetails } from '../../../lib/api';
import { Product } from '../../../types';
import QuickEditModal, { ProductUpdates } from './QuickEditModal';

interface ManageProductsViewProps {
    onAddProduct: () => void;
    sellerId: string;
}

const ManageProductsView: React.FC<ManageProductsViewProps> = ({ onAddProduct, sellerId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'archive' | 'inactive' | 'incomplete' | 'draft' | 'deleted'>('all');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'archive', label: 'Archive' },
        { id: 'inactive', label: 'Inactive' },
        { id: 'incomplete', label: 'Incomplete' },
        { id: 'draft', label: 'Draft' },
        { id: 'deleted', label: 'Deleted' },
    ];

    const loadProducts = async () => {
        setIsLoading(true);
        if (sellerId) {
            // Fetch products for this seller
            // We pass empty appliedFilters to get all products for the vendor
            const data = await fetchFilteredProducts(searchQuery, {
                category_ids: [],
                brand_ids: [],
                price_min: null,
                price_max: null,
                attributes: {}
            }, sellerId);
            setProducts(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        // Debounce search could be added here, but for now simple dependency is fine for reasonable item counts
        loadProducts();
    }, [sellerId, searchQuery]);

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleSaveProductUpdate = async (productId: string, updates: ProductUpdates) => {
        try {
            await updateProductDetails(productId, updates);
            // Refresh the product list to show changes
            await loadProducts();
        } catch (error) {
            console.error('Error saving product update:', error);
            throw error; // Let the modal handle the error display
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

    return (
        <div className="space-y-4">
            {/* Header with Add Product Button */}
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

            {/* Alert Banners - Conditional rendering or dynamic later */}
            <div className="space-y-3">
                {/* 
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <span className="material-icons text-orange-500">error_outline</span>
                        <div>
                            <p className="text-sm font-medium text-orange-900">
                                8 pricing error(s). Product(s) cannot be listed until properly priced
                            </p>
                        </div>
                    </div>
                    <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">
                        Take action →
                    </button>
                </div>
                */}
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center gap-1">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeFilter === filter.id
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
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

            {/* Products Table */}
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status
                                    <div className="text-xs font-normal text-gray-400 normal-case mt-0.5">Date Added</div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[300px]">
                                    Product name
                                    <div className="text-xs font-normal text-gray-400 normal-case mt-0.5">Image</div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading products...</td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No products found. Add your first product!</td>
                                </tr>
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
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                Active
                                            </span>
                                            {/* We don't have created_at in Product interface yet, using deliveryDate as placeholder or empty */}
                                            <div className="text-xs text-gray-500 mt-1">{product.deliveryDate || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <img src={product.image} alt={product.title} className="w-12 h-12 rounded object-cover flex-shrink-0 bg-gray-100" />
                                                <p className="text-sm text-gray-900 line-clamp-2">{product.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {product.categoryName || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">£{product.price}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.rating} ({product.reviews})</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditProduct(product)}
                                                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                                                    More
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
        </div>
    );
};

export default ManageProductsView;
