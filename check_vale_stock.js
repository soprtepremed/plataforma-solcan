import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStock() {
  console.log('=== Verificando Items de VALE-542679 ===');
  const { data: vale } = await supabase
    .from('solicitudes_vale')
    .select('id, folio')
    .eq('folio', 'VALE-542679')
    .single();

  if (!vale) {
    console.log('Vale no encontrado');
    return;
  }

  const { data: items, error } = await supabase
    .from('solicitudes_items')
    .select('*, material:materiales_catalogo(nombre, prefijo)')
    .eq('vale_id', vale.id);

  if (error) {
    console.log('Error items:', error);
    return;
  }

  console.log('Items del vale:');
  for (const item of items) {
    console.log(`- ${item.material?.nombre} (ID: ${item.material_catalogo_id}): Solicitado = ${item.cantidad_solicitada}, Lote solicitado = ${item.lote_solicitado}`);
    
    // Check stock
    let query = supabase
      .from('materiales_unidades')
      .select('id, lote_numero, estatus')
      .eq('catalogo_id', item.material_catalogo_id)
      .eq('estatus', 'Almacenado');

    if (item.lote_solicitado && item.lote_solicitado !== 'SIN LOTE') {
      query = query.eq('lote_numero', item.lote_solicitado);
    }

    const { data: unidades } = await query;
    console.log(`  Unidades Almacenadas en stock: ${unidades ? unidades.length : 0}`);
    if (unidades && unidades.length > 0) {
      console.log('  Lotes disponibles:', [...new Set(unidades.map(u => u.lote_numero))]);
    }
  }
}

checkStock();
