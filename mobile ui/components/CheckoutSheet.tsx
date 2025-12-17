import React, { useMemo, useState } from 'react';
import { Product } from '@/types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutSheetProps {
  items: CartItem[];
  onClose: () => void;
  onPlaceOrder: () => void;
}

const formatPrice = (value: number, currency?: string) => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${currency ? currency + ' ' : ''}${value.toFixed(2)}`;
  }
};

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ items, onClose, onPlaceOrder }) => {
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const [payment, setPayment] = useState<'card' | 'cod' | 'wallet'>('card');
  const [selectedAddress, setSelectedAddress] = useState<'home' | 'new'>('home');

  const currency = items[0]?.product.currency;

  const subtotal = useMemo(
    () => items.reduce((sum, line) => sum + (line.product.price || 0) * line.quantity, 0),
    [items]
  );

  const shippingCost = shipping === 'express' ? 6.99 : 0;
  const fees = 0; // placeholder for taxes/fees if needed
  const total = subtotal + shippingCost + fees;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-hidden">
        {/* Drag handle / header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
          <button aria-label="Close" className="absolute right-4 top-3 text-gray-500" onClick={onClose}>
            <span className="material-icons-outlined text-xl">close</span>
          </button>
        </div>

        <div className="px-4 pb-4 pt-1 overflow-y-auto space-y-4">
          {/* Address */}
          <section className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-primary">location_on</span>
                <h3 className="text-sm font-bold text-black dark:text-white">Delivery address</h3>
              </div>
              <button className="text-xs font-semibold text-primary" onClick={() => setSelectedAddress('new')}>Change</button>
            </div>
            <div className="space-y-2">
              <label className={`flex items-center gap-2 p-2 rounded-xl border ${selectedAddress === 'home' ? 'border-primary bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === 'home'}
                  onChange={() => setSelectedAddress('home')}
                />
                <div className="text-xs text-gray-700 dark:text-gray-200">
                  <div className="font-semibold">Home</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">123 Market Street, Suite 4</div>
                </div>
              </label>
              <label className={`flex items-center gap-2 p-2 rounded-xl border ${selectedAddress === 'new' ? 'border-primary bg-white dark:bg-gray-800' : 'border-dashed border-gray-300 dark:border-gray-700'}`}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === 'new'}
                  onChange={() => setSelectedAddress('new')}
                />
                <div className="text-xs text-gray-700 dark:text-gray-200">Add a new address</div>
              </label>
            </div>
          </section>

          {/* Items summary */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-black dark:text-white">Order summary</h3>
              <span className="text-xs text-gray-500">{items.reduce((s, i) => s + i.quantity, 0)} items</span>
            </div>
            <div className="space-y-3">
              {items.map((line) => (
                <div key={line.product.id} className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={line.product.image} alt={line.product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-black dark:text-white line-clamp-2">{line.product.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Qty {line.quantity}</div>
                  </div>
                  <div className="text-xs font-bold text-black dark:text-white whitespace-nowrap">
                    {formatPrice((line.product.price || 0) * line.quantity, currency)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-black dark:text-white mb-2">Delivery speed</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'standard', label: 'Standard (3-5d)', price: 0 }, { key: 'express', label: 'Express (1-2d)', price: 6.99 }].map((opt) => (
                <button
                  key={opt.key}
                  className={`rounded-2xl border p-3 text-left text-xs font-semibold transition ${shipping === opt.key ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
                  onClick={() => setShipping(opt.key as 'standard' | 'express')}
                >
                  <div>{opt.label}</div>
                  <div className="text-[11px] font-bold mt-1">{opt.price === 0 ? 'Free' : formatPrice(opt.price, currency)}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-black dark:text-white mb-2">Payment</h3>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'card', label: 'Card' }, { key: 'wallet', label: 'Wallet' }, { key: 'cod', label: 'Cash' }].map((opt) => (
                <button
                  key={opt.key}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${payment === opt.key ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
                  onClick={() => setPayment(opt.key as 'card' | 'wallet' | 'cod')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              {payment === 'cod' ? 'Pay on delivery available for eligible orders.' : 'Cards and wallets are processed securely with 3D Secure where required.'}
            </div>
          </section>

          {/* Totals */}
          <section className="bg-white dark:bg-gray-900/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Items</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost, currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>Fees & taxes</span>
              <span>{formatPrice(fees, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-black dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            <button
              className="w-full bg-primary hover:bg-orange-600 text-white font-bold rounded-full py-3 text-sm shadow-md transition-colors mt-2"
              onClick={onPlaceOrder}
            >
              Place order ({items.reduce((s, i) => s + i.quantity, 0)})
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSheet;
