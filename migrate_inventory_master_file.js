import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
ALTER TABLE materiales_catalogo 
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS proveedor TEXT,
ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS presentacion TEXT DEFAULT 'Unidad',
ADD COLUMN IF NOT EXISTS requiere_frio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ean_maestro TEXT,
ADD COLUMN IF NOT EXISTS alerta_caducidad_dias INTEGER DEFAULT 30;

COMMENT ON COLUMN materiales_catalogo.costo_unitario IS 'Costo de adquisición por unidad de medida';
COMMENT ON COLUMN materiales_catalogo.requiere_frio IS 'Define si el material debe mantenerse en red de frío (2-8°C)';
`;

async function runMigration() {
  console.log('🚀 Expandiendo el esquema de materiales_catalogo...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Catálogo expandido exitosamente.');
    process.exit(0);
  }
}

runMigration();
