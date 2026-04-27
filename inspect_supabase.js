import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
  console.log('--- Inspeccionando Tabla equipos_calibracion ---');
  
  // Intentamos obtener una fila para ver las columnas
  const { data, error } = await supabase
    .from('equipos_calibracion')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error al inspeccionar:', error.message);
    console.log('Código:', error.code);
  } else {
    console.log('Columnas encontradas:', data.length > 0 ? Object.keys(data[0]) : 'Sin datos para inspeccionar');
    
    // Si no hay datos, intentamos un insert mínimo para ver qué falla
    console.log('Intentando insert de prueba...');
    const { error: insError } = await supabase
      .from('equipos_calibracion')
      .insert({ area_id: 'test', nombre: 'test', puntos: [] });
    
    if (insError) {
      console.error('Fallo en INSERT:', insError.message);
      console.log('Código:', insError.code);
    } else {
      console.log('INSERT exitoso.');
      await supabase.from('equipos_calibracion').delete().eq('nombre', 'test');
    }
  }
  process.exit(0);
}

inspectTable();
