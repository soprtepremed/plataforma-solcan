
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Leer .env manualmente para obtener las credenciales
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim()];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearLogs() {
  console.log('Iniciando limpieza de bitácoras...');
  
  // En Supabase, para borrar todo con la anon key, necesitamos que la política lo permita 
  // o ejecutar línea por línea si el RLS es restrictivo. 
  // Intentaremos un borrado masivo primero.
  
  const { data, error } = await supabase
    .from('logistica_envios')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Borra todo lo que no coincida con un ID inexistente

  if (error) {
    console.error('Error al limpiar registros:', error.message);
    
    if (error.message.includes('RLS')) {
      console.log('Parece que hay restricciones de RLS. Intentando via RPC si existe...');
    }
  } else {
    console.log('¡Éxito! Todos los registros han sido eliminados.');
  }
}

clearLogs();
