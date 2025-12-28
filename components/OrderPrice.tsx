import React from 'react';
import { useCurrencyConverter } from '../lib/currency';

interface OrderPriceProps {
    amount: number;
    currency: string;
    className?: string;
    showOriginal?: boolean;
}

export const OrderPrice: React.FC<OrderPriceProps> = ({ amount, currency, className = '', showOriginal = false }) => {
    const { convertedValues, isLoading } = useCurrencyConverter(
        [{ amount, currency, id: 'price' }]
    );

    if (isLoading || !convertedValues['price']) {
        return <span className={`animate-pulse bg-gray-200 rounded h-4 w-16 inline-block ${className}`} />;
    }

    const { converted, original } = convertedValues['price'];

    // If converted exists (and differs), show it.
    // If showOriginal is true, we might want to show both, but typically we just want the converted one.
    // For now, if converted is available, show it. Otherwise original.

    return (
        <span className={className}>
            {converted || original}
            {showOriginal && converted && (
                <span className="text-xs text-gray-400 ml-1 line-through">{original}</span>
            )}
        </span>
    );
};
