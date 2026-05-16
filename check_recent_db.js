import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('=== 1. Verificando Vales Recientes ===');
  const { data: vales, error: e1 } = await supabase
    .from('solicitudes_vale')
    .select('id, folio, estatus, area_destino, created_at, observaciones')
    .order('created_at', { ascending: false })
    .limit(5);

  if (e1) console.log('Error vales:', e1);
  else console.log('Vales:', vales);

  console.log('\n=== 2. Verificando Items de Inventario Recientes en Áreas ===');
  const { data: inv, error: e2 } = await supabase
    .from('inventario_areas')
    .select('id, area_id, codigo, descripcion, stock_actual, created_at, solicitud_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (e2) console.log('Error inventario:', e2);
  else console.log('Inventario Reciente:', inv);
}

checkDatabase();
