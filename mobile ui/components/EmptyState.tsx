import React from 'react';

/**
 * Unified Empty State component for consistent empty views across the app.
 * Uses premium styling with icons, titles, and optional CTAs.
 */

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
            {/* Icon Container */}
            <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-5 shadow-inner">
                <span className="material-icons-round text-4xl text-gray-300 dark:text-gray-600">
                    {icon}
                </span>
            </div>

            {/* Title */}
            <h3 className="text-[15px] font-black text-gray-700 dark:text-gray-300 tracking-tight mb-1.5">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-[12px] text-gray-400 font-medium max-w-[240px] leading-relaxed">
                    {description}
                </p>
            )}

            {/* Optional CTA Button */}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

// Pre-configured empty states for common use cases
export const EmptyStates = {
    NoProducts: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="inventory_2"
            title="No products found"
            description="Try adjusting your filters or search terms"
            {...props}
        />
    ),
    NoOrders: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="receipt_long"
            title="No orders yet"
            description="Your order history will appear here after your first purchase"
            {...props}
        />
    ),
    NoReviews: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="rate_review"
            title="No reviews yet"
            description="Be the first to share your experience"
            {...props}
        />
    ),
    NoMessages: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="chat_bubble_outline"
            title="No messages"
            description="Start a conversation with sellers about their products"
            {...props}
        />
    ),
    NoNotifications: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="notifications_none"
            title="All caught up!"
            description="You don't have any new notifications"
            {...props}
        />
    ),
    NoWishlist: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="favorite_border"
            title="Wishlist is empty"
            description="Tap the heart on products you love to save them here"
            {...props}
        />
    ),
    NoResults: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="search_off"
            title="No results found"
            description="Try different keywords or browse our categories"
            {...props}
        />
    ),
    NoCategories: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="category"
            title="No categories found"
            description="Try selecting another department"
            {...props}
        />
    ),
    EmptyCart: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="shopping_cart"
            title="Your cart is empty"
            description="Add items you love to start shopping"
            {...props}
        />
    ),
    NoAddress: (props?: Partial<EmptyStateProps>) => (
        <EmptyState
            icon="location_on"
            title="No addresses saved"
            description="Add a delivery address for faster checkout"
            {...props}
        />
    ),
};

export default EmptyState;
