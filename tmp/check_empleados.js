import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ayreitpndsnogedsqidg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmVpdHBuZHNub2dlZHNxaWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5OTUzMTR9.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2-XREAtMDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Schema:', Object.keys(data[0] || {}));
        console.log('Data sample:', data[0]);
    }
}

checkSchema();
