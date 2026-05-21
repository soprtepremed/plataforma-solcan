import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function list() {
  console.log('Querying all equipment from Supabase...');
  const { data, error } = await supabase
    .from('mantenimiento_equipos')
    .select('id, nombre, area, sucursal, serie, frecuencia, ultimo_manto, proximo_manto');
    
  if (error) {
    console.error('Error querying:', error.message);
    process.exit(1);
  }
  
  console.log(`Total equipment items: ${data.length}`);
  data.forEach(eq => {
    console.log(`- ${eq.id}: ${eq.nombre} (${eq.area}) [${eq.sucursal}] - Serie: ${eq.serie} - Frec: ${eq.frecuencia} - Last: ${eq.ultimo_manto} - Next: ${eq.proximo_manto}`);
  });
}

list();
