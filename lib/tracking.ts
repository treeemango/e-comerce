import { supabase } from './supabase';
import { getOrCreateSessionId } from './sessionUtils';

// Keep track of recently viewed products to prevent double counting
const recentViews = new Map<string, number>();

// Track product view with session support
export const trackProductView = async (
    productId: string,
    userId: string | null = null,
    sessionId?: string
) => {
    const now = Date.now();
    const lastViewTime = recentViews.get(productId);

    // Debounce: If viewed within last 5 seconds, don't track again
    if (lastViewTime && (now - lastViewTime < 5000)) {
        console.log(`Skipping duplicate view for product: ${productId}`);
        return null;
    }

    recentViews.set(productId, now);

    // Get or create session ID if not provided
    const finalSessionId = sessionId || getOrCreateSessionId();

    console.log(`Tracking view - Product: ${productId}, User: ${userId || 'anonymous'}, Session: ${finalSessionId}`);

    // 1. Track for analytics (anonymous + logged in) via RPC
    try {
        const { data, error } = await supabase
            .rpc('track_product_view', {
                p_product_id: productId,
                p_user_id: userId,
                p_session_id: finalSessionId
            });

        if (error) {
            console.error('Error tracking product view (RPC):', error);
        } else {
            console.log('Product view tracked (RPC):', data);
        }
    } catch (error) {
        console.error('Error tracking product view:', error);
    }

    // 2. Track for "Recent Views" history (Logged-in users only) - Direct Insert
    if (userId) {
        try {
            const { error: historyError } = await supabase
                .from('product_views')
                .insert({
                    user_id: userId,
                    product_id: productId
                });

            if (historyError) {
                // Ignore unique constraint errors keys (duplicate views in same timestamp)
                if (historyError.code !== '23505') {
                    console.error('Error tracking view for history:', historyError);
                }
            } else {
                console.log('View recorded in history (product_views)');
            }
        } catch (err) {
            console.error('Exception tracking view history:', err);
        }
    }

    return null;
};

// For anonymous users
export const trackProductViewAnonymous = async (productId: string, sessionId?: string) => {
    return await trackProductView(productId, null, sessionId);
};

// Auto-detect user type and track
export const trackProductViewAuto = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = getOrCreateSessionId();

    if (user) {
        return await trackProductView(productId, user.id, sessionId);
    } else {
        return await trackProductViewAnonymous(productId, sessionId);
    }
};
