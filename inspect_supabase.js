import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
  console.log('--- Inspeccionando Tabla logistica_envios ---');
  
  const { data, error } = await supabase
    .from('logistica_envios')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error al inspeccionar:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columnas encontradas:');
      console.log(Object.keys(data[0]).sort().join('\n'));
    } else {
      console.log('Sin datos para inspeccionar.');
    }
  }
  process.exit(0);
}

inspectTable();
