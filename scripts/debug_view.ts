
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
    console.log('Fetching admin_conversation_overview...');
    const { data, error } = await supabase
        .from('admin_conversation_overview')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching view:', error);
        return;
    }

    console.log('View Data Sample:');
    console.log(JSON.stringify(data, null, 2));

    if (!data || data.length === 0) {
        console.log("No data found in view. Checking users table...");
        const { data: users, error: userError } = await supabase.from('users').select('id, full_name').limit(5);
        if (userError) console.error("Error fetching users:", userError);
        else console.log("Users Sample:", users);
    }
}

checkView();
