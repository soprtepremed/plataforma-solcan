import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  console.log('--- Listando Tablas Visibles ---');
  // En Supabase, a veces podemos consultar rpc si está habilitado, o simplemente intentar acceder a tablas comunes
  const tables = ['inventario_areas', 'materiales_catalogo', 'equipos_calibracion'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('count').limit(1);
    if (error) {
      console.log(`[ ] ${t}: ${error.message} (${error.code})`);
    } else {
      console.log(`[X] ${t}: Accesible`);
    }
  }
  process.exit(0);
}

listTables();
