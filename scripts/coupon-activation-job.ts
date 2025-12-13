import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
    process.exit(1);
}

// Service role client for background job; no session persistence needed.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function activateCoupons(): Promise<void> {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
        .from('coupons')
        .update({ status: 'Ongoing' })
        .eq('status', 'Upcoming')
        .lte('start_time', nowIso)
        .select('id');

    if (error) {
        throw error;
    }

    const updatedCount = data?.length ?? 0;
    console.log(`Activated ${updatedCount} coupon(s) at ${nowIso}`);
}

activateCoupons()
    .catch(err => {
        console.error('Activation job failed:', err.message || err);
        process.exit(1);
    })
    .then(() => {
        console.log('Activation job completed.');
        process.exit(0);
    });
