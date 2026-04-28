import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
ALTER TABLE logistica_envios 
ADD COLUMN IF NOT EXISTS r_hisopo_detalle TEXT,
ADD COLUMN IF NOT EXISTS r_sec_suero INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_sec_edta INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_sec_citrato INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_sec_orina INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_sec_dialisis INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_orina_24h INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_mycoplasma INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_esputo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_pcr_covid INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_cultivos_detalle TEXT,
ADD COLUMN IF NOT EXISTS r_hemo_micologico INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_adm_recibos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS r_adm_instituciones INTEGER DEFAULT 0;
`;

async function updateSchema() {
  console.log('🔧 Actualizando esquema de logistica_envios...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error actualizando esquema:', error.message);
  } else {
    console.log('✅ Esquema actualizado exitosamente con todas las columnas de recepción.');
  }
}

updateSchema();
