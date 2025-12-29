import React, { useEffect, useState, useMemo } from 'react';
import { fetchSellerBalance, fetchSellerPayouts, requestPayout } from '../../lib/api';
import { SellerBalanceSummary, SellerPayout } from '../../types';
import { cn } from '../../lib/utils';
import { useCurrencyConverter, formatPrice } from '../../lib/currency';
import { supabase } from '../../lib/supabase';

interface SellerWalletViewProps {
    sellerId: string;
    onBack?: () => void;
    stats?: any;
}

export const SellerWalletView: React.FC<SellerWalletViewProps> = ({ sellerId, onBack }) => {
    const [balance, setBalance] = useState<SellerBalanceSummary | null>(null);
    const [payouts, setPayouts] = useState<SellerPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [withdrawalMethod, setWithdrawalMethod] = useState<'bank_transfer' | 'mobile_money'>('mobile_money');

    useEffect(() => {
        const loadWalletData = async () => {
            setLoading(true);
            const [balanceData, payoutsData] = await Promise.all([
                fetchSellerBalance(sellerId),
                fetchSellerPayouts(sellerId)
            ]);
            setBalance(balanceData);
            setPayouts(payoutsData);
            setLoading(false);
        };

        loadWalletData();

        // Set up Realtime subscription for balance and payouts
        const balanceSubscription = supabase
            .channel('wallet_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'seller_payouts',
                filter: `seller_id=eq.${sellerId}`
            }, () => {
                loadWalletData(); // Reload everything on change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(balanceSubscription);
        };
    }, [sellerId]);

    const handleWithdraw = async () => {
        if (!balance || balance.total_available <= 0) return;

        setRequesting(true);
        const result = await requestPayout(sellerId, balance.total_available, withdrawalMethod);
        if (result.success) {
            alert('Withdrawal request submitted!');
            // Refresh balance
            const balanceData = await fetchSellerBalance(sellerId);
            setBalance(balanceData);
        } else {
            alert('Failed: ' + result.message);
        }
        setRequesting(false);
    };

    // Currency conversion for wallet amounts - MUST be before any early returns
    const priceValues = useMemo(() => {
        const vals: { id: string; amount: number; currency: string }[] = [];

        vals.push({ id: 'total-available', amount: balance?.total_available ?? 0, currency: 'USD' });
        vals.push({ id: 'total-escrow', amount: balance?.total_escrow ?? 0, currency: 'USD' });
        vals.push({ id: 'pending-clearance', amount: balance?.pending_clearance ?? 0, currency: 'USD' });

        payouts.forEach((payout, idx) => {
            vals.push({ id: `payout-${idx}`, amount: payout.amount, currency: 'USD' });
        });

        return vals;
    }, [balance, payouts]);

    const { convertedValues, preferredCurrency } = useCurrencyConverter(priceValues);

    const getConvertedPrice = (id: string, fallback: number) => {
        return convertedValues[id]?.converted ?? formatPrice(fallback, preferredCurrency);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading your wallet...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            {/* Wallet Header */}
            <div className="bg-white px-5 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <span className="material-icons text-9xl text-orange-600">account_balance_wallet</span>
                </div>

                <div className="relative z-20 flex items-center gap-3 mb-6">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90 transition-transform"
                        >
                            <span className="material-icons-round text-gray-600 dark:text-gray-400 text-lg">arrow_back</span>
                        </button>
                    )}
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Wallet & Payouts</h2>
                </div>

                <div className="relative z-10 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Available</p>
                    <h1 className="text-5xl font-black text-slate-800 tracking-tight mb-6">
                        {getConvertedPrice('total-available', balance?.total_available ?? 0)}
                    </h1>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">In Escrow</p>
                            <p className="text-lg font-black text-orange-600">{getConvertedPrice('total-escrow', balance?.total_escrow ?? 0)}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Pending Clearance</p>
                            <p className="text-lg font-black text-blue-600">{getConvertedPrice('pending-clearance', balance?.pending_clearance ?? 0)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setWithdrawalMethod('mobile_money')}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", withdrawalMethod === 'mobile_money' ? "bg-white shadow-sm text-slate-800" : "text-gray-500")}
                            >
                                M-Pesa
                            </button>
                            <button
                                onClick={() => setWithdrawalMethod('bank_transfer')}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", withdrawalMethod === 'bank_transfer' ? "bg-white shadow-sm text-slate-800" : "text-gray-500")}
                            >
                                Bank Transfer
                            </button>
                        </div>
                        <button
                            onClick={handleWithdraw}
                            disabled={requesting || (balance?.total_available ?? 0) <= 0}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition disabled:opacity-50 disabled:scale-100"
                        >
                            {requesting ? 'Processing...' : 'Withdraw Funds'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Incoming Funds (Progress List) */}
            <div className="px-5 mt-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Incoming Funds</h3>
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-full">10-Day Maturity Cycle</span>
                </div>

                <div className="space-y-3">
                    {payouts.filter(p => p.status === 'escrow').length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 p-8 rounded-2xl text-center">
                            <p className="text-gray-400 text-sm">No incoming funds at the moment.</p>
                        </div>
                    ) : (
                        payouts.filter(p => p.status === 'escrow').map(payout => (
                            <div key={payout.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400">Order #{payout.order_number || payout.order_id.substring(0, 8)}</p>
                                        <p className="text-lg font-black text-slate-800">{getConvertedPrice(`payout-${payouts.indexOf(payout)}`, payout.amount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Available on</p>
                                        <p className="text-xs font-black text-emerald-600">{new Date(payout.available_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-1000"
                                        style={{
                                            width: `${Math.min(100, Math.max(10, (10 - (new Date(payout.available_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) * 10))}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Payout History */}
            <div className="px-5 mt-10 mb-8">
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4 px-1">Recent Payouts</h3>
                <div className="space-y-3">
                    {payouts.filter(p => p.status === 'paid').slice(0, 5).map(payout => (
                        <div key={payout.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <span className="material-icons text-emerald-500 text-lg">check_circle</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Payout Completed</p>
                                    <p className="text-[10px] text-gray-400">{new Date(payout.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-800">+{getConvertedPrice(`payout-${payouts.indexOf(payout)}`, payout.amount)}</p>
                            </div>
                        </div>
                    ))}
                    {payouts.filter(p => p.status === 'paid').length === 0 && (
                        <p className="text-gray-400 text-center text-sm py-4">No payout history yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
