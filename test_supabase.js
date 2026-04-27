import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  console.log('--- Verificando Tabla equipos_calibracion ---');
  // Usamos un count simple para verificar existencia
  const { data, error, count } = await supabase
    .from('equipos_calibracion')
    .select('*', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    if (error.code === '42P01') {
      console.error('ERROR: La tabla "equipos_calibracion" NO existe en la base de datos.');
      console.log('Por favor, crea la tabla con la siguiente estructura:');
      console.log('CREATE TABLE equipos_calibracion (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  area_id TEXT NOT NULL,');
      console.log('  nombre TEXT NOT NULL,');
      console.log('  unidad TEXT DEFAULT \'°C\',');
      console.log('  puntos JSONB NOT NULL,');
      console.log('  created_at TIMESTAMPTZ DEFAULT now()');
      console.log(');');
    } else {
      console.error('ERROR de Supabase:', error.message);
      console.log('Código de Error:', error.code);
    }
    process.exit(1);
  } else {
    console.log('ÉXITO: La tabla existe y es accesible.');
    process.exit(0);
  }
}

checkTable();
