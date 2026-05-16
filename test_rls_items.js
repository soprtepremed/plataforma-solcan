import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSItems() {
  console.log('--- Probando Actualización de solicitudes_items con Select ---');

  // Obtener un item id de VALE-542679
  const { data: vale } = await supabase
    .from('solicitudes_vale')
    .select('id')
    .eq('folio', 'VALE-542679')
    .single();

  const { data: items } = await supabase
    .from('solicitudes_items')
    .select('id, cantidad_surtida')
    .eq('vale_id', vale.id)
    .limit(1);

  if (!items || items.length === 0) {
    console.log('No se encontraron items.');
    return;
  }

  const itemId = items[0].id;

  const { data, error } = await supabase
    .from('solicitudes_items')
    .update({
      cantidad_surtida: 1
    })
    .eq('id', itemId)
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Resultado de la actualización (select):', data);
    if (data.length === 0) {
      console.log('⚠️ ADVERTENCIA: RLS está bloqueando la actualización en solicitudes_items.');
    } else {
      console.log('Éxito: solicitudes_items se actualizó correctamente ✅');
    }
  }
}

testRLSItems();
