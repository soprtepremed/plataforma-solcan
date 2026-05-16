import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUnits() {
  const materialId = 'f2628bd7-7d42-49e4-a7de-da00618be61b'; // CREATININA
  const { data: units, error } = await supabase
    .from('materiales_unidades')
    .select('id, lote_numero, estatus, created_at')
    .eq('catalogo_id', materialId);

  if (error) console.log('Error:', error);
  else console.log('All units for CREATININA:', units);
}

checkUnits();
