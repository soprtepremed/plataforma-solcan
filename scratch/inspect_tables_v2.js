import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Checking materiales_catalogo...");
    const { data: cat } = await supabase.from('materiales_catalogo').select('*').limit(1);
    console.log(cat ? Object.keys(cat[0]) : "No data");

    console.log("\nChecking materiales_unidades...");
    const { data: uni } = await supabase.from('materiales_unidades').select('*').limit(1);
    console.log(uni ? Object.keys(uni[0]) : "No data");
}

inspect();
