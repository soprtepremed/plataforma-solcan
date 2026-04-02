import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ayreitpndsnogedsqidg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmVpdHBuZHNub2dlZHNxaWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5OTUzMTR9.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2-XREAtMDU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    const { data: perfiles, error } = await supabase
        .from('perfiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching perfiles:', error.message);
        // Try other common table names
        const { data: users, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .limit(1);
        if (userError) {
            console.error('Error fetching usuarios:', userError.message);
        } else {
            console.log('Table found: usuarios');
            console.log('Schema:', Object.keys(users[0] || {}));
        }
    } else {
        console.log('Table found: perfiles');
        console.log('Schema:', Object.keys(perfiles[0] || {}));
    }
}

listUsers();
