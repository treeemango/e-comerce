import React, { useMemo, useState, useEffect } from 'react';
import { User } from '@/types';
import { fetchBuyerNotificationPreferences, updateBuyerNotificationPreferences } from '@/lib/api';

interface BuyerNotificationsViewProps {
    user?: User | null;
}

const BuyerNotificationsView: React.FC<BuyerNotificationsViewProps> = ({ user }) => {
    const [prefs, setPrefs] = useState({
        orders: true,
        deals: true,
        price_drops: true,
        messages: true,
        recommendations: false,
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user?.id) {
            loadPreferences(user.id);
        }
    }, [user?.id]);

    const loadPreferences = async (userId: string) => {
        setIsLoading(true);
        try {
            const data = await fetchBuyerNotificationPreferences(userId);
            if (data) {
                setPrefs({
                    orders: data.orders ?? true,
                    deals: data.deals ?? true,
                    price_drops: data.price_drops ?? true,
                    messages: data.messages ?? true,
                    recommendations: data.recommendations ?? false,
                });
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const enabledCount = useMemo(() => Object.values(prefs).filter(Boolean).length, [prefs]);

    const toggle = async (key: keyof typeof prefs) => {
        const newValue = !prefs[key];

        // Optimistic update
        setPrefs((p) => ({ ...p, [key]: newValue }));

        if (user?.id) {
            const success = await updateBuyerNotificationPreferences(user.id, { [key]: newValue });
            if (!success) {
                // Revert on failure
                setPrefs((p) => ({ ...p, [key]: !newValue }));
                console.error('Failed to update notification preference');
            }
        }
    };

    const PreferenceRow = ({ label, description, field }: { label: string; description: string; field: keyof typeof prefs }) => (
        <div className="flex items-start justify-between gap-4 py-3">
            <div>
                <div className="text-sm font-semibold text-slate-900">{label}</div>
                <div className="text-xs text-gray-500">{description}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={prefs[field]}
                    onChange={() => toggle(field)}
                    className="sr-only peer"
                    disabled={!user || isLoading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="material-icons text-base text-orange-500">notifications_none</span>
                        Notifications
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Choose what you want to hear about</h2>
                    <p className="text-sm text-gray-600">
                        {user ? 'Your settings are synced across your account.' : 'These settings are local only. Sign in to sync.'}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500">Enabled</div>
                    <div className="text-2xl font-bold text-slate-900">{enabledCount}</div>
                </div>
            </div>

            {!user && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                    <span className="material-icons text-base">info_outline</span>
                    Sign in so we can sync your notification preferences across devices.
                </div>
            )}

            <div className={`bg-white border border-gray-200 rounded-xl p-6 divide-y divide-gray-200 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                <PreferenceRow
                    label="Order updates"
                    description="Shipping, delivery, and changes to your orders."
                    field="orders"
                />
                <PreferenceRow
                    label="Deals & coupons"
                    description="Personalized deals, coupons, and lightning sales."
                    field="deals"
                />
                <PreferenceRow
                    label="Price drops"
                    description="Alerts when items you viewed drop in price."
                    field="price_drops"
                />
                <PreferenceRow
                    label="Messages"
                    description="Replies from sellers and support."
                    field="messages"
                />
                <PreferenceRow
                    label="Recommendations"
                    description="New arrivals tailored to your browsing."
                    field="recommendations"
                />
            </div>
        </div>
    );
};

export default BuyerNotificationsView;
