import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('empleados')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching data:', error.message);
        } else if (data && data.length > 0) {
            console.log('Schema:', Object.keys(data[0]));
        } else {
            console.log('Table exists but is empty.');
        }
    } catch (e) {
        console.error('Fetch exception:', e.message);
    }
}

checkSchema();
