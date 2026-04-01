import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
ALTER TABLE logistica_envios 
ADD COLUMN IF NOT EXISTS s_lila INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_verde INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_orina_24h INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_medio_transporte INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_hisopo INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_laminilla_he INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_laminilla_mi INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_heces INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS s_otros_cant TEXT,
ADD COLUMN IF NOT EXISTS s_otros_analisis TEXT,
ADD COLUMN IF NOT EXISTS s_papel INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS f_do_001 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_da_001 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_qc_020 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS f_rm_004 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS a_hemato_user TEXT, ADD COLUMN IF NOT EXISTS a_hemato_time TEXT,
ADD COLUMN IF NOT EXISTS a_uro_user TEXT, ADD COLUMN IF NOT EXISTS a_uro_time TEXT,
ADD COLUMN IF NOT EXISTS a_quimica_user TEXT, ADD COLUMN IF NOT EXISTS a_quimica_time TEXT,
ADD COLUMN IF NOT EXISTS a_archivo_user TEXT, ADD COLUMN IF NOT EXISTS a_archivo_time TEXT,
ADD COLUMN IF NOT EXISTS a_calidad_user TEXT, ADD COLUMN IF NOT EXISTS a_calidad_time TEXT,
ADD COLUMN IF NOT EXISTS a_admin_user TEXT, ADD COLUMN IF NOT EXISTS a_admin_time TEXT,
ADD COLUMN IF NOT EXISTS a_recursos_user TEXT, ADD COLUMN IF NOT EXISTS a_recursos_time TEXT;

COMMENT ON TABLE logistica_envios IS 'Actualizada para compatibilidad total con formato FO-DO-017';
`;

async function runMigration() {
  console.log('🚀 Iniciando migración de esquema FO-DO-017...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Migración completada exitosamente.');
    process.exit(0);
  }
}

runMigration();
