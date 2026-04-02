import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listTables() {
  console.log('🔍 Listando tablas disponibles...');
  
  // Usamos una query al RPC de Supabase o intentamos listar a traves de postgrest
  const { data, error } = await supabase.rpc('get_tables');
  
  if (error) {
    console.error('Error (RPC):', error.message);
    // Intento B: Si no hay RPC, probamos con una query genérica
    const { data: d2, error: e2 } = await supabase.from('empleados').select('*').limit(1);
    if (e2) {
      console.error('Error (Directo a empleados):', e2.message);
    } else {
      console.log('✅ ¡La tabla "empleados" EXISTE!');
    }
    return;
  }
}

listTables();
