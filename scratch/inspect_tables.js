import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
    console.log("Checking materiales_catalogo...");
    const { data: cat } = await supabase.from('materiales_catalogo').select('*').limit(1);
    console.log(cat ? Object.keys(cat[0]) : "No data");

    console.log("\nChecking materiales_unidades...");
    const { data: uni } = await supabase.from('materiales_unidades').select('*').limit(1);
    console.log(uni ? Object.keys(uni[0]) : "No data");
}

inspect();
