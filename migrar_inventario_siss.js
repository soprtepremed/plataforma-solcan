import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function migrarInventario() {
  console.log('🏗️ Iniciando migración de arquitectura de materiales (SISS)...');
  
  const sql = `
    -- 1. Catálogo Maestro de Artículos
    CREATE TABLE IF NOT EXISTS materiales_catalogo (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(255) NOT NULL,
      area_tecnica VARCHAR(50) NOT NULL,
      prefijo VARCHAR(10) NOT NULL,
      stock_minimo INT DEFAULT 0,
      unidad VARCHAR(20) DEFAULT 'pza',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(prefijo)
    );

    -- 2. Unidades Individuales Serializadas (Cajas/Botes)
    CREATE TABLE IF NOT EXISTS materiales_unidades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      catalogo_id UUID REFERENCES materiales_catalogo(id) ON DELETE CASCADE,
      lote_numero VARCHAR(50),
      caducidad DATE,
      consecutivo_lote INT DEFAULT 1,
      codigo_barras_unico VARCHAR(100) UNIQUE,
      estatus VARCHAR(20) DEFAULT 'Almacenado',
      area_actual VARCHAR(50),
      quimico_inicio_id UUID REFERENCES empleados(id),
      fecha_entrada_almacen TIMESTAMPTZ DEFAULT NOW(),
      fecha_inicio_uso TIMESTAMPTZ,
      fecha_finalizacion TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Calendario Dinámico de Resurtido
    CREATE TABLE IF NOT EXISTS materiales_calendario (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      area_tecnica VARCHAR(50) NOT NULL,
      dias_resurtido INT[] NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(area_tecnica)
    );

    -- 4. Vales de Solicitud de Material
    CREATE TABLE IF NOT EXISTS materiales_vales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      solicitante_id UUID REFERENCES empleados(id),
      area_tecnica VARCHAR(50) NOT NULL,
      detalles JSONB,
      estatus VARCHAR(20) DEFAULT 'Pendiente',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Inserción Inicial de Reglas de Calendario
    INSERT INTO materiales_calendario (area_tecnica, dias_resurtido) VALUES 
    ('hemato', ARRAY[3, 6]) ON CONFLICT (area_tecnica) DO UPDATE SET dias_resurtido = EXCLUDED.dias_resurtido;
    INSERT INTO materiales_calendario (area_tecnica, dias_resurtido) VALUES 
    ('uro', ARRAY[1, 2]) ON CONFLICT (area_tecnica) DO UPDATE SET dias_resurtido = EXCLUDED.dias_resurtido;
  `;

  const { error } = await supabase.rpc('exec_sql', { query_text: sql });

  if (error) {
    console.error('❌ Error de migración:', error.message);
  } else {
    console.log('✅ Arquitectura SISS desplegada con éxito en la base de datos de Solcan.');
  }
}

migrarInventario();
