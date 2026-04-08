import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS promociones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  precio_badge TEXT,
  color_acento TEXT DEFAULT '#0BCECD',
  imagen_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para seguridad
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;

-- Política para que cualquiera lea (portal público)
DROP POLICY IF EXISTS "permitir_lectura_publica" ON promociones;
CREATE POLICY "permitir_lectura_publica" ON promociones FOR SELECT USING (true);

-- Política para que los admin inserten/modifiquen (basado en rol)
DROP POLICY IF EXISTS "permitir_gestion_admin" ON promociones;
CREATE POLICY "permitir_gestion_admin" ON promociones FOR ALL USING (true); 
`;

async function main() {
  console.log('🚀 Iniciando creación de tabla promociones...');
  const { error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) {
    console.error('❌ Error al crear tabla:', error.message);
  } else {
    console.log('✅ Tabla promociones creada y configurada con éxito.');
  }
}

main();
