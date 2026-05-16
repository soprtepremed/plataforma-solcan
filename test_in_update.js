import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdates() {
  const unidadIds = []; // empty array
  const { error: updErr } = await supabase
      .from('materiales_unidades')
      .update({ estatus: 'Despachado' })
      .in('id', unidadIds);

  if (updErr) {
      console.log('updErr:', updErr);
  } else {
      console.log('materiales_unidades OK');
  }
}

testUpdates();
