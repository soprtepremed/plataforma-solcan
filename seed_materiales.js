import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedMateriales() {
  console.log('🌱 Sembrando catálogo inicial de materiales...');
  
  const catalogo = [
    { nombre: 'Tubo Rojo Vacutainer', area_tecnica: 'hemato', prefijo: 'TR', stock_minimo: 100, unidad: 'pza' },
    { nombre: 'Tubo Lila EDTA', area_tecnica: 'hemato', prefijo: 'TL', stock_minimo: 100, unidad: 'pza' },
    { nombre: 'Reactivo Hematología A', area_tecnica: 'hemato', prefijo: 'RH', stock_minimo: 5, unidad: 'caja' },
    { nombre: 'Tiras Reactivas Uroanálisis', area_tecnica: 'uro', prefijo: 'RU', stock_minimo: 10, unidad: 'frasco' },
    { nombre: 'Guantes de Látex M', area_tecnica: 'archivo', prefijo: 'GL', stock_minimo: 20, unidad: 'caja' }
  ];

  for (const item of catalogo) {
    const { error } = await supabase.from('materiales_catalogo').upsert([item], { onConflict: 'prefijo' });
    if (error) console.error(`Error en ${item.nombre}:`, error.message);
    else console.log(`✅ ${item.nombre} registrado.`);
  }
}

seedMateriales();
