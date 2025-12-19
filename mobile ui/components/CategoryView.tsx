import React from 'react';
import { Product, NavbarCategory } from '@/types';
import { ValueProps } from './ValueProps';
import { ProductCard } from './ProductCard';

// Local interface matching the mock data structure in data.ts
interface Category {
  id: string;
  name: string;
  subCategories?: { id: string; name: string; imageUrl: string }[];
  products: Product[];
}

interface CategoryViewProps {
  category: Category;
  onProductClick: (product: Product) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({ category, onProductClick }) => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Value Props Bar */}
      <ValueProps />

      {/* Sub Category Circles */}
      {category.subCategories && (
        <div className="bg-surface-light dark:bg-surface-dark py-3 px-2 overflow-x-auto hide-scrollbar border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-4 min-w-max px-2">
            {category.subCategories.map((sub, index) => (
              <div key={sub.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${index === 0 ? 'border-black dark:border-white p-0.5' : 'border-transparent'}`}>
                  <img src={sub.imageUrl} alt={sub.name} className="w-full h-full rounded-full object-cover" />
                </div>
                <span className={`text-xs text-center max-w-[64px] leading-tight ${index === 0 ? 'font-bold text-black dark:text-white bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 rounded-full' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                  {index === 0 ? 'All' : sub.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="p-2">
        <div className="grid grid-cols-2 gap-2">
          {category.products.map(product => (
            <ProductCard key={product.id} product={product} onClick={() => onProductClick(product)} />
          ))}
        </div>
      </div>

      <div className="h-4 w-full flex items-center justify-center my-4">
        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mx-1"></span>
        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mx-1"></span>
        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mx-1"></span>
      </div>
    </div>
  );
};
