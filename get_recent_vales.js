import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkVales() {
  const { data: vales, error: e1 } = await supabase
    .from('solicitudes_vale')
    .select('id, folio, estatus, area_destino, created_at, observaciones')
    .order('created_at', { ascending: false })
    .limit(5);

  if (e1) console.log('Error vales:', e1);
  else console.log('Vales:', vales);
}

checkVales();
