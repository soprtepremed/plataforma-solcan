import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
// Usamos la anon key para probar acceso público o service_role si necesitas ver todo
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, anonKey);

async function verify() {
  console.log('🚀 Probando conexión con Supabase (Modo ESM)...');

  try {
    // 1. Probar listar buckets (requiere que el bucket sea público o políticas de lectura)
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.error('❌ Error de Storage:', storageError.message);
    } else {
      console.log('✅ Conexión Storage exitosa. Buckets:', buckets.map(b => b.name));
    } 1 no

    // 2. Probar acceso a la tabla
    const { data, error: dbError } = await supabase
      .from('logistica_envios')
      .select('id')
      .limit(1);

    if (dbError) {
      console.error('❌ Error de Base de Datos:', dbError.message);
    } else {
      console.log('✅ Conexión Base de Datos exitosa. Datos leídos correctamente.');
    }
  } catch (err) {
    console.error('❌ Error critico en el script:', err.message);
  }
}

verify();
