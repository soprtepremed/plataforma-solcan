import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
ALTER TABLE materiales_catalogo 
ADD COLUMN IF NOT EXISTS ubicacion TEXT DEFAULT 'Almacén General';

COMMENT ON COLUMN materiales_catalogo.ubicacion IS 'Ubicación física del material (Estante, Refrigerador, Pasillo, etc.)';
`;

async function runMigration() {
  console.log('🚀 Añadiendo columna "ubicacion" a materiales_catalogo...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Migración de ubicación completada exitosamente.');
    process.exit(0);
  }
}

runMigration();
