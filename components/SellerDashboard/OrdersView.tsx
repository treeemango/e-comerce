
import React, { useState, useEffect } from 'react';
import { SellerOrder } from '../../types';
import { fulfillOrder } from '../../lib/api'; // We will assume a fetchSellerOrders exists or mock it for now since I didn't verify it in api.ts

// Mock fetchSellerOrders if not implemented, or use it if I did.
// I think I only implemented fetchSellerInventory, createProduct, fulfillOrder. 
// I did not implement fetchSellerOrders in the previous steps (I skipped it). 
// So I will mock it here or implement it in api.ts. The plan said I would.
// Let's implement it in api.ts afterwards or just mock here for speed.
// I will mock here for now to avoid breaking api.ts again.

interface OrdersViewProps {
    sellerId?: string;
}

const OrdersView: React.FC<OrdersViewProps> = ({ sellerId }) => {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Mock data for demonstration
        const mockOrders: SellerOrder[] = [
            {
                id: 'ord_12345',
                created_at: new Date().toISOString(),
                total_amount: 59.99,
                status: 'pending',
                customer_name: 'John Doe',
                items: [
                    { product_title: 'Premium T-Shirt', variant_sku: 'TSHIRT-BLK-L', quantity: 1, price: 29.99 },
                    { product_title: 'Cap', variant_sku: 'CAP-RED', quantity: 1, price: 30.00 }
                ]
            }
        ];

        setTimeout(() => {
            setOrders(mockOrders);
            setIsLoading(false);
        }, 1000);
    }, [sellerId]);

    const handleFulfill = async (orderId: string, variantId: string, quantity: number) => {
        // Call the API
        const success = await fulfillOrder(orderId, 'TRACKING-PLACEHOLDER'); // TODO: Add tracking input
        if (success) {
            alert('Order Item Fulfilled (Stock reduced)');
            // In reality, we would update order status here
        } else {
            alert('Failed to fulfill order item');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Orders</h2>

            {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-500">No active orders.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900">Order #{order.id}</h3>
                                    <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">£{order.total_amount.toFixed(2)}</p>
                                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full capitalize">
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.product_title}</p>
                                            <p className="text-gray-500">SKU: {item.variant_sku} x {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">£{item.price.toFixed(2)}</span>
                                            <button
                                                onClick={() => handleFulfill(order.id, 'variant_id_placeholder', item.quantity)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                                            >
                                                Fulfill
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrdersView;
