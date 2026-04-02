import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedUnidades() {
  console.log('📦 Generando unidades de prueba (Serializadas)...');
  
  // 1. Obtener los IDs del catálogo
  const { data: catalogo } = await supabase.from('materiales_catalogo').select('*');
  
  const unidades = [];
  
  catalogo.forEach(item => {
    // Generar 2 unidades por cada item del catálogo para pruebas
    for (let i = 1; i <= 2; i++) {
      unidades.push({
        catalogo_id: item.id,
        lote_numero: 'LOTE-TEST-001',
        caducidad: '2027-12-31',
        consecutivo_lote: i,
        codigo_barras_unico: `${item.prefijo}-26-100/0${i}`,
        estatus: 'Almacenado',
        area_actual: item.area_tecnica,
        fecha_entrada_almacen: new Date().toISOString()
      });
    }
  });

  const { error } = await supabase.from('materiales_unidades').insert(unidades);
  if (error) {
    console.error('❌ Error al insertar unidades:', error.message);
  } else {
    console.log(`✅ ${unidades.length} unidades físicas registradas con éxito.`);
    console.log('📋 Códigos de prueba disponibles:');
    unidades.forEach(u => console.log(`   - [${u.area_actual}] ${u.codigo_barras_unico}`));
  }
}

seedUnidades();
