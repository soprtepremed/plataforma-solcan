import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
  const folio = 'VALE-542679';
  console.log('--- Probando Actualización con Select ---');

  const { data, error } = await supabase
    .from('solicitudes_vale')
    .update({
      estatus: 'Surtido',
      fecha_surtido: new Date().toISOString()
    })
    .eq('folio', folio)
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Resultado de la actualización (select):', data);
    if (data.length === 0) {
      console.log('⚠️ ADVERTENCIA: Se retornó un array vacío! RLS está bloqueando la actualización de esta fila.');
    }
  }
}

testRLS();
