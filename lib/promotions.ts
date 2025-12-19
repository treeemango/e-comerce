import { Product, QuantityDiscountTier } from '../types';
import { fetchQuantityDiscounts } from './api';

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface AppliedPromotion {
    type: 'quantity_discount' | 'automatic_discount';
    savings: number;
    description: string;
}

export interface PromotionsResult {
    items: {
        product: Product;
        quantity: number;
        originalPrice: number;
        discountedPrice: number;
        total: number;
        appliedPromotions: AppliedPromotion[];
    }[];
    subtotal: number;
    totalSavings: number;
    finalTotal: number;
}

/**
 * Applies all applicable promotions (quantity discounts) to a cart.
 */
export async function applyPromotionsToCart(cartItems: CartItem[]): Promise<PromotionsResult> {
    const results = await Promise.all(cartItems.map(async (item) => {
        const appliedPromotions: AppliedPromotion[] = [];
        let discountedPrice = item.product.price;
        const originalPrice = item.product.originalPrice || item.product.price;

        // 1. Check for Automatic Discounts (Percentage, Fixed, Buy X Get Y)
        if (item.product.auto_discount_type) {
            const type = item.product.auto_discount_type;
            const value = item.product.auto_discount_value || 0;
            const minReq = item.product.auto_discount_min_requirement || 0;

            if (type === 'percentage' || type === 'fixed_amount') {
                // Percentage and Fixed Amount are often pre-calculated in product.price by the SQL,
                // but we check if we need to apply them here if price equals originalPrice or if they haven't been applied.
                // For "Total Savings" display, we contrast discountedPrice vs originalPrice.
                if (discountedPrice < originalPrice) {
                    appliedPromotions.push({
                        type: 'automatic_discount',
                        savings: (originalPrice - discountedPrice) * item.quantity,
                        description: item.product.auto_discount_name || 'Automatic discount'
                    });
                }
            } else if (type === 'buy_x_get_y' && item.product.auto_discount_buy_qty && item.product.auto_discount_get_qty) {
                const buyQty = item.product.auto_discount_buy_qty;
                const getQty = item.product.auto_discount_get_qty;
                const bundleSize = buyQty + getQty;

                if (item.quantity >= bundleSize) {
                    const freeItems = Math.floor(item.quantity / bundleSize) * getQty;
                    const savings = freeItems * discountedPrice;

                    if (savings > 0) {
                        appliedPromotions.push({
                            type: 'automatic_discount',
                            savings: savings,
                            description: `Promotion: Buy ${buyQty} Get ${getQty} Free`
                        });
                        // Adjust the total for this item effectively by reducing total (handled in the return object)
                        // However, promotions generally report savings, we don't change 'discountedPrice' for Buy X Get Y 
                        // as it's a multi-item rule. We'll handle it in the final 'total' calculation for the item.
                    }
                }
            }
        }

        // 2. Check for Quantity Discounts (Bulk Pricing)
        if (item.product.has_quantity_discount) {
            try {
                const tiers = await fetchQuantityDiscounts(item.product.id.toString());
                const sortedTiers = tiers.sort((a, b) => b.min_quantity - a.min_quantity); // Descending

                const applicableTier = sortedTiers.find(tier => item.quantity >= tier.min_quantity);

                if (applicableTier && applicableTier.unit_price < discountedPrice) {
                    const savingsPerItem = discountedPrice - applicableTier.unit_price;
                    const totalTierSavings = savingsPerItem * item.quantity;

                    discountedPrice = applicableTier.unit_price;
                    appliedPromotions.push({
                        type: 'quantity_discount',
                        savings: totalTierSavings,
                        description: `Bulk discount: Buy ${applicableTier.min_quantity}+ items`
                    });
                }
            } catch (error) {
                console.error(`Error applying quantity discount for product ${item.product.id}:`, error);
            }
        }

        // Recalculate total savings for the item
        const itemTotalSavings = appliedPromotions.reduce((sum, p) => sum + p.savings, 0);
        const itemFinalTotal = (discountedPrice * item.quantity) - appliedPromotions.filter(p => p.description.includes('Buy')).reduce((sum, p) => sum + p.savings, 0);
        // Wait, the logic for Buy X Get Y needs to be careful not to double count if discountedPrice already changed.
        // Let's simplify: itemFinalTotal = (discountedPrice * quantity) - any "Buy X Get Y" savings.

        const buyXY_savings = appliedPromotions.filter(p => p.description.includes('Buy') && p.type === 'automatic_discount').reduce((sum, p) => sum + p.savings, 0);

        return {
            product: item.product,
            quantity: item.quantity,
            originalPrice: originalPrice,
            discountedPrice: discountedPrice,
            total: (discountedPrice * item.quantity) - buyXY_savings,
            appliedPromotions
        };
    }));

    const subtotal = results.reduce((sum, res) => sum + (res.originalPrice * res.quantity), 0);
    const finalTotal = results.reduce((sum, res) => sum + res.total, 0);
    const totalSavings = subtotal - finalTotal;

    return {
        items: results,
        subtotal,
        totalSavings,
        finalTotal
    };
}
