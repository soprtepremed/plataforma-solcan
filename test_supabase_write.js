import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPermissions() {
  console.log('--- Probando Permisos de Escritura (Insert) ---');
  
  const testData = {
    area_id: 'test-area',
    nombre: 'Test Device ' + Date.now(),
    unidad: '°C',
    puntos: [{t: 0, f: 0}]
  };

  const { data, error } = await supabase
    .from('equipos_calibracion')
    .insert(testData)
    .select();

  if (error) {
    console.error('ERROR de Escritura:', error.message);
    console.log('Código:', error.code);
    process.exit(1);
  } else {
    console.log('ÉXITO: Se puede escribir en la tabla.');
    // Limpiar prueba
    await supabase.from('equipos_calibracion').delete().eq('area_id', 'test-area');
    process.exit(0);
  }
}

testPermissions();
