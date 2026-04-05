import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SQL_MIGRATION = `
ALTER TABLE logistica_envios 
ADD COLUMN IF NOT EXISTS a_micro_user TEXT,
ADD COLUMN IF NOT EXISTS a_micro_time TIME,
ADD COLUMN IF NOT EXISTS a_micro_obs TEXT,
ADD COLUMN IF NOT EXISTS r_laminilla_he INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_laminilla_mi INTEGER DEFAULT 0;
`;

async function runMigration() {
  console.log('🚀 Iniciando migración de Microbiología...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: SQL_MIGRATION
  });

  if (error) {
    console.error('❌ Error en el RPC exec_sql:', error);
    // Intento alternativo si exec_sql no existe
    console.log('Refrescando esquema...');
  } else {
    console.log('✅ Base de datos actualizada exitosamente.');
  }
}

runMigration();
