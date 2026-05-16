import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdates() {
  console.log('Testing update on solicitudes_vale...');
  const { error: valeErr } = await supabase
    .from('solicitudes_vale')
    .update({ 
        estatus: 'Surtido', 
        fecha_surtido: new Date().toISOString(),
        firma_solicitante: 'test signature',
        observaciones: 'Test'
    })
    .eq('id', '11111111-1111-1111-1111-111111111111');
  if (valeErr) {
      console.log('valeErr:', valeErr);
  } else {
      console.log('solicitudes_vale OK');
  }

  console.log('Testing update on solicitudes_items...');
  const { error: itemsErr } = await supabase
    .from('solicitudes_items')
    .update({ cantidad_surtida: 1 })
    .eq('id', '11111111-1111-1111-1111-111111111111');
  if (itemsErr) {
      console.log('itemsErr:', itemsErr);
  } else {
      console.log('solicitudes_items OK');
  }

  console.log('Testing insert on inventario_areas...');
  const { error: invErr } = await supabase
    .from('inventario_areas')
    .insert([{
        area_id: 'test',
        codigo: 'test',
        descripcion: 'test',
        lote: 'test',
        caducidad: null,
        stock_actual: 1,
        solicitud_id: 'test',
        fecha_solicitud_almacen: new Date().toISOString().substring(0, 10),
        aceptado: true,
        sucursal: 'Matriz',
        sub_area: 'TEST',
        temp_almacenamiento: 'T/A'
    }]);
  if (invErr) {
      console.log('invErr:', invErr);
  } else {
      console.log('inventario_areas OK');
  }
}

testUpdates();
