import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
-- 1. Tablas de Vales de Material
CREATE TABLE IF NOT EXISTS solicitudes_vale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT UNIQUE NOT NULL,
    solicitante_id UUID REFERENCES empleados(id),
    area_destino TEXT NOT NULL,
    estatus TEXT DEFAULT 'Pendiente',
    prioridad TEXT DEFAULT 'Media',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS solicitudes_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vale_id UUID REFERENCES solicitudes_vale(id) ON DELETE CASCADE,
    material_catalogo_id UUID REFERENCES materiales_catalogo(id),
    cantidad_solicitada INT NOT NULL,
    cantidad_surtida INT DEFAULT 0,
    notas_almacen TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar el usuario Almacén si no existe
INSERT INTO empleados (username, nombre, pin, role, sucursal)
VALUES ('almacen', 'Encargado de Almacén', '1234', 'almacen', 'Almacén Central')
ON CONFLICT (username) DO NOTHING;

-- 3. Habilitar RLS (Opcional por ahora para facilitar desarrollo, pero recomendado)
ALTER TABLE solicitudes_vale ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_items ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Permitir todo a autenticados por ahora para agilizar)
CREATE POLICY "Permitir todo a autenticados en vales" ON solicitudes_vale FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir todo a autenticados en items" ON solicitudes_items FOR ALL TO authenticated USING (true);
`;

async function runMigration() {
  console.log('🚀 Iniciando migración del Módulo de Almacén...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Tablas de Almacén creadas y usuario registrado.');
    process.exit(0);
  }
}

runMigration();
