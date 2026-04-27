import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
  console.log('--- Buscando Tablas en el Schema public ---');
  // Una forma de ver qué tablas son visibles es intentar un select de algo que no existe y ver el error,
  // o si hay alguna tabla de sistema accesible.
  // Pero lo más efectivo es probar las que ya conocemos del proyecto.
  const knownTables = [
    'inventario_areas', 
    'materiales_catalogo', 
    'usuarios', 
    'bitacora_maquilas',
    'resultados_quimica',
    'pedidos_maquila',
    'configuraciones'
  ];
  
  for (const t of knownTables) {
    const { error } = await supabase.from(t).select('count', { count: 'exact', head: true }).limit(1);
    if (!error) {
      console.log(`[X] ${t}`);
    } else if (error.code !== '42P01' && error.code !== 'PGRST204' && error.code !== 'PGRST205') {
      console.log(`[?] ${t}: Error ${error.code} (${error.message})`);
    }
  }
  process.exit(0);
}

listAllTables();
