import React, { useEffect, useState } from 'react';
import { fetchSellerBalance, fetchSellerPayouts, requestPayout } from '@/lib/api';
import { SellerBalanceSummary, SellerPayout } from '@/types';
import { supabase } from '@/lib/supabase';

interface WalletViewProps {
    sellerId: string;
}

const WalletView: React.FC<WalletViewProps> = ({ sellerId }) => {
    const [balance, setBalance] = useState<SellerBalanceSummary | null>(null);
    const [payouts, setPayouts] = useState<SellerPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [withdrawalMethod, setWithdrawalMethod] = useState<'bank_transfer' | 'mobile_money'>('mobile_money');

    useEffect(() => {
        const loadWalletData = async () => {
            setLoading(true);
            try {
                const [balanceData, payoutsData] = await Promise.all([
                    fetchSellerBalance(sellerId),
                    fetchSellerPayouts(sellerId)
                ]);
                setBalance(balanceData);
                setPayouts(payoutsData);
            } catch (error) {
                console.error('Error loading wallet data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadWalletData();

        // Real-time subscription
        const subscription = supabase
            .channel(`seller_wallet_${sellerId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'seller_payouts',
                filter: `seller_id=eq.${sellerId}`
            }, () => {
                loadWalletData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [sellerId]);

    const handleWithdraw = async () => {
        if (!balance || balance.total_available <= 0) return;

        setRequesting(true);
        try {
            const result = await requestPayout(sellerId, balance.total_available, withdrawalMethod);
            if (result.success) {
                alert('Withdrawal request submitted!');
                const balanceData = await fetchSellerBalance(sellerId);
                setBalance(balanceData);
            } else {
                alert('Withdrawal failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error requesting payout:', error);
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Available for Withdrawal</p>
                        <h2 className="text-4xl font-black text-gray-900 mt-2">
                            £{(balance?.total_available ?? 0).toLocaleString()}
                        </h2>
                        <div className="mt-8 flex flex-col gap-3">
                            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button
                                    onClick={() => setWithdrawalMethod('mobile_money')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${withdrawalMethod === 'mobile_money' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    M-Pesa
                                </button>
                                <button
                                    onClick={() => setWithdrawalMethod('bank_transfer')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${withdrawalMethod === 'bank_transfer' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Bank Transfer
                                </button>
                            </div>
                            <button
                                onClick={handleWithdraw}
                                disabled={requesting || (balance?.total_available ?? 0) <= 0}
                                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:hover:bg-gray-900 active:scale-95 shadow-lg shadow-gray-200"
                            >
                                {requesting ? 'Processing...' : 'Withdraw Funds'}
                            </button>
                        </div>
                    </div>
                    <span className="material-icons absolute -bottom-4 -right-4 text-9xl text-gray-50 group-hover:text-orange-50 transition-colors duration-500 pointer-events-none">
                        account_balance_wallet
                    </span>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                            <span className="material-icons">lock_clock</span>
                        </div>
                        <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">In Escrow</p>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">
                        £{(balance?.total_escrow ?? 0).toLocaleString()}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2">Funds held during customer protection period</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                            <span className="material-icons">verified</span>
                        </div>
                        <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Earned</p>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">
                        £{payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2">Successfully processed payouts to date</p>
                </div>
            </div>

            {/* Content Tabs Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Incoming Funds List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Incoming Funds Cycle</h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">10-Day Maturity</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                        {payouts.filter(p => p.status === 'escrow').length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 text-sm italic">No pending escrow payments.</p>
                            </div>
                        ) : (
                            payouts.filter(p => p.status === 'escrow').map((payout) => {
                                const maturityDays = 10;
                                const remainingDays = Math.max(0, Math.ceil((new Date(payout.available_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                                const progress = ((maturityDays - remainingDays) / maturityDays) * 100;

                                return (
                                    <div key={payout.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Order #{payout.order_number || payout.order_id.substring(0, 8)}</p>
                                                <p className="text-xl font-black text-gray-900">£{payout.amount.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Available On</p>
                                                <p className="text-sm font-bold text-emerald-600">{new Date(payout.available_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="relative pt-1">
                                            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
                                                <div
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500 transition-all duration-1000"
                                                ></div>
                                            </div>
                                            <div className="flex justify-between mt-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Processing</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{remainingDays} days remaining</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Recent History Sidebar */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                        {payouts.slice(0, 10).map((payout) => (
                            <div key={payout.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${payout.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                        <span className="material-icons text-sm">{payout.status === 'paid' ? 'check' : 'schedule'}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 capitalize">{payout.status}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(payout.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`text-sm font-black ${payout.status === 'paid' ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {payout.status === 'paid' ? '+' : ''}£{payout.amount.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletView;
