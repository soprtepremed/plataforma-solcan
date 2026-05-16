import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDates() {
  console.log('=== Consultando fechas de inventario_areas para A1C SLIDE ===');
  const { data, error } = await supabase
    .from('inventario_areas')
    .select('id, descripcion, lote, fecha_solicitud_almacen, created_at')
    .eq('descripcion', 'A1C SLIDE');

  if (error) console.log(error);
  else console.log('Rows:', data);
}

checkDates();
