import React from 'react';
import { SellerOrder } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface BuyerReceiptProps {
    order: SellerOrder;
}

const BuyerReceipt: React.FC<BuyerReceiptProps> = ({ order }) => {
    const currency = order.items?.[0]?.currency || 'USD';

    return (
        <>
            <div className="receipt-print-area p-6 bg-white text-black max-w-3xl mx-auto border border-gray-100 shadow-sm no-screen">
                {/* Header / Merchant Logo */}
                <div className="flex justify-between items-start mb-10 border-b-2 border-gray-900 pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-gray-900">JuaExpress</h1>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">Marketplace Receipt</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-900 uppercase">Official Receipt</h2>
                        <p className="text-sm text-gray-600 mt-1">Order #{(order.order_number || order.id.substring(0, 8)).toUpperCase()}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
                    </div>
                </div>

                {/* Customer & Shipping Info */}
                <div className="grid grid-cols-2 gap-12 mb-10">
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Information</h3>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-900">{order.customer_name}</p>
                            <p className="text-sm text-gray-700">{order.customer_email || 'No email provided'}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Address</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-800 leading-relaxed font-medium">
                                {order.shipping_address || 'Address provided at checkout'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Order Items Table */}
                <div className="mb-10">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                                <th className="text-center py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                                <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {order.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-4">
                                        <p className="text-sm font-bold text-gray-900">{item.product_title}</p>
                                        {item.variant_sku && <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {item.variant_sku}</p>}
                                    </td>
                                    <td className="py-4 text-center text-sm font-medium text-gray-700">{item.quantity}</td>
                                    <td className="py-4 text-right text-sm font-medium text-gray-700">{formatCurrency(item.price, currency)}</td>
                                    <td className="py-4 text-right text-sm font-bold text-gray-900">{formatCurrency(item.price * item.quantity, currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary & Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{formatCurrency((order.total_amount || 0) - (order.tax_amount || 0) - (order.delivery_fee || 0), currency)}</span>
                        </div>
                        {order.tax_amount ? (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Tax ({((order.tax_rate || 0) * 100).toFixed(0)}%)</span>
                                <span className="font-medium">{formatCurrency(order.tax_amount, currency)}</span>
                            </div>
                        ) : null}
                        {order.delivery_fee ? (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Delivery Fee</span>
                                <span className="font-medium">{formatCurrency(order.delivery_fee, currency)}</span>
                            </div>
                        ) : null}
                        <div className="pt-3 border-t-2 border-gray-900 flex justify-between items-baseline">
                            <span className="text-base font-black uppercase">Total Due</span>
                            <span className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(order.total_amount || 0, currency)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Notes */}
                <div className="mt-auto pt-20 border-t border-gray-100 text-center">
                    <div className="mb-6 opacity-30 grayscale">
                        <span className="material-icons text-5xl text-gray-900">verified</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Thank you for your business!</h4>
                    <p className="text-xs text-gray-500 px-12 leading-relaxed">
                        This receipt is automatically generated. Please attach it to the package for the buyer's records.
                        For support, please contact help@supaybae.com or your seller dashboard.
                    </p>
                    <div className="mt-8 pt-8 border-t border-gray-100 flex justify-center gap-8 opacity-50 grayscale">
                        <div className="flex items-center gap-1.5">
                            <span className="material-icons text-xs">lock</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="material-icons text-xs">local_shipping</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Express Delivery</span>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .no-screen {
                    display: none;
                }
                @media print {
                    @page {
                        margin: 0.5cm;
                        size: A4 portrait;
                    }
                    /* Hide everything by default */
                    html, body, #root, .mobile-shell, .mobile-shell > * {
                        visibility: hidden !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    /* Standard body overrides */
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Force the receipt and its content to be visible */
                    .receipt-print-area, 
                    .receipt-print-area * {
                        visibility: visible !important;
                    }
                    /* Position the receipt for print */
                    .receipt-print-area {
                        display: block !important;
                        position: relative !important;
                        left: auto !important;
                        top: auto !important;
                        width: 100% !important;
                        max-width: 19cm !important;
                        height: auto !important;
                        margin: 0 auto !important;
                        padding: 0.75cm !important;
                        background: white !important;
                        overflow: visible !important;
                        page-break-after: avoid !important;
                    }
                    .receipt-print-area style {
                        display: none !important;
                    }
                    /* Layout preservation */
                    .receipt-print-area table {
                        display: table !important;
                        width: 100% !important;
                    }
                    .receipt-print-area thead { display: table-header-group !important; }
                    .receipt-print-area tbody { display: table-row-group !important; }
                    .receipt-print-area tr { display: table-row !important; }
                    .receipt-print-area td, .receipt-print-area th { display: table-cell !important; }
                    .receipt-print-area .flex { display: flex !important; }
                    .receipt-print-area .justify-between { justify-content: space-between !important; }
                    .receipt-print-area .justify-end { justify-content: flex-end !important; }
                    .receipt-print-area .grid { display: grid !important; }
                    .receipt-print-area .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    
                    /* Prevent page breaks */
                    .receipt-print-area h1, .receipt-print-area h2, .receipt-print-area h3 {
                        page-break-after: avoid !important;
                    }
                    .receipt-print-area table {
                        page-break-inside: avoid !important;
                    }
                    
                    /* Optimize spacing for print */
                    .receipt-print-area .p-8 { padding: 0.5cm !important; }
                    .receipt-print-area .mb-10 { margin-bottom: 0.5cm !important; }
                    .receipt-print-area .gap-12 { gap: 0.3cm !important; }
                }
            ` }} />
        </>
    );
};

export default BuyerReceipt;
