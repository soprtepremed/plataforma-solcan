import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sql = `
-- 1. Políticas para solicitudes_vale
DROP POLICY IF EXISTS "Permitir creación pública de vales" ON solicitudes_vale;
CREATE POLICY "Permitir creación pública de vales" 
ON solicitudes_vale FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir historial público de vales" ON solicitudes_vale;
CREATE POLICY "Permitir historial público de vales" 
ON solicitudes_vale FOR SELECT 
TO public 
USING (true);

-- 2. Políticas para solicitudes_items
DROP POLICY IF EXISTS "Permitir creación pública de items de vale" ON solicitudes_items;
CREATE POLICY "Permitir creación pública de items de vale" 
ON solicitudes_items FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir historial público de items" ON solicitudes_items;
CREATE POLICY "Permitir historial público de items" 
ON solicitudes_items FOR SELECT 
TO public 
USING (true);

-- 3. Catálogo de materiales
DROP POLICY IF EXISTS "Permitir lectura pública del catálogo" ON materiales_catalogo;
CREATE POLICY "Permitir lectura pública del catálogo" 
ON materiales_catalogo FOR SELECT 
TO public 
USING (true);
`;

async function applySql() {
  console.log('🚀 Aplicando políticas RLS para Almacén...');
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql
  });
  if (error) {
    console.error('❌ Error ejecutando SQL:', error);
  } else {
    console.log('✅ Políticas aplicadas con éxito.');
  }
}

applySql();
