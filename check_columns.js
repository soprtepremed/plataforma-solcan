import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('=== Verificando columnas de solicitudes_vale ===');
  const { data: vData, error: vErr } = await supabase
    .from('solicitudes_vale')
    .select('id, folio, firma_receptor, nombre_receptor')
    .limit(1);

  if (vErr) {
    console.error('Error en solicitudes_vale:', vErr.message, vErr.code);
  } else {
    console.log('Columnas de solicitudes_vale existen ✅');
  }

  console.log('\n=== Verificando columnas de solicitudes_items ===');
  const { data: iData, error: iErr } = await supabase
    .from('solicitudes_items')
    .select('id, cantidad_surtida')
    .limit(1);

  if (iErr) {
    console.error('Error en solicitudes_items:', iErr.message, iErr.code);
  } else {
    console.log('Columnas de solicitudes_items existen ✅');
  }
}

checkColumns();
