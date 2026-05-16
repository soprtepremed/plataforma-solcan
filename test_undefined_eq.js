import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUndefined() {
  try {
    let query = supabase
        .from('materiales_unidades')
        .select('id, lote_numero, caducidad, catalogo_id')
        .eq('catalogo_id', undefined)
        .eq('estatus', 'Almacenado')
        .limit(1);

    const { data, error } = await query;
    if (error) throw error;
    console.log("No error:", data);
  } catch (err) {
    console.log("Error caught:", err);
  }
}

testUndefined();
