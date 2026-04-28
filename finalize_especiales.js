import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) {
    throw error;
  }
  return data;
}

async function start() {
  console.log('🚀 Iniciando finalización del catálogo de estudios especiales...');

  try {
    // 1. Limpiar tabla (para evitar los duplicados que detectamos)
    console.log('🧹 Limpiando tabla especiales_catalogo...');
    await executeSQL('TRUNCATE public.especiales_catalogo;');

    // 2. Cargar datos del SQL completo
    console.log('📦 Cargando datos desde catalogo_data_completo.sql...');
    const fullSQL = fs.readFileSync('catalogo_data_completo.sql', 'utf-8');
    
    // El archivo tiene el INSERT INTO ... VALUES (...), (...);
    // Lo ejecutamos directamente vía RPC
    await executeSQL(fullSQL);
    console.log('✅ Inserción masiva completada.');

    // 3. Crear índices de rendimiento
    console.log('⚡ Creando índices de alto rendimiento (GIN Trigram y B-tree)...');
    const indexesSQL = `
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      
      CREATE INDEX IF NOT EXISTS idx_especiales_nombre_trgm ON public.especiales_catalogo USING gin (nombre gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_especiales_clave_trgm ON public.especiales_catalogo USING gin (clave_orthin gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_especiales_metodologia_trgm ON public.especiales_catalogo USING gin (metodologia gin_trgm_ops);
      
      CREATE INDEX IF NOT EXISTS idx_especiales_nombre_sort ON public.especiales_catalogo (nombre ASC);
      CREATE INDEX IF NOT EXISTS idx_especiales_clave_orthin ON public.especiales_catalogo (clave_orthin);
    `;
    await executeSQL(indexesSQL);
    console.log('✅ Índices creados.');

    // 4. Verificación final
    const { count } = await supabase.from('especiales_catalogo').select('id', { count: 'exact', head: true });
    console.log(`\n🎉 PROCESO FINALIZADO EXITOSAMENTE.`);
    console.log(`📊 Registros cargados: ${count}`);
    
    if (count === 996) {
      console.log('✨ La cantidad de registros coincide exactamente con el catálogo oficial.');
    } else {
      console.warn(`⚠️ Advertencia: Se esperaban 996 registros pero hay ${count}.`);
    }

  } catch (err) {
    console.error('❌ Error fatal durante la ejecución:', err.message);
    process.exit(1);
  }
}

start();
