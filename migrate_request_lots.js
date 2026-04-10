import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
ALTER TABLE solicitudes_items 
ADD COLUMN IF NOT EXISTS lote_solicitado TEXT,
ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN solicitudes_items.lote_solicitado IS 'El número de lote específico solicitado por el usuario (Caso B)';
`;

async function runMigration() {
  console.log('🚀 Preparando solicitudes_items para selección de lotes...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Base de datos lista para el Carrito de Compras.');
    process.exit(0);
  }
}

runMigration();
