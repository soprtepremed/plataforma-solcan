import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRecords() {
  console.log('=== Actualizando registros de inventario_areas para VALE-542679 ===');
  
  const { data, error } = await supabase
    .from('inventario_areas')
    .update({ 
      area_id: 'quimica_clinica',
      sub_area: 'QUÍMICA CLÍNICA',
      sucursal: 'Tuxtla Gutierrez'
    })
    .eq('solicitud_id', 'VALE-542679');

  if (error) {
    console.error('Error al actualizar:', error);
  } else {
    console.log('Éxito: Se corrigieron los registros existentes de VALE-542679 para que pertenezcan a Química Clínica en Tuxtla Gutiérrez.');
  }
}

fixRecords();
