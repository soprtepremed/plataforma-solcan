import { createClient } from '@supabase/supabase-js';

const URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(URL, SERVICE_KEY);

const sql = `
-- Habilitar acceso público (anon) para UPSERT en push_subscriptions
DROP POLICY IF EXISTS "Permitir registro público de suscripciones" ON push_subscriptions;
CREATE POLICY "Permitir registro público de suscripciones" 
ON push_subscriptions FOR ALL 
USING (true) 
WITH CHECK (true);

-- Habilitar escritura en push_logs para auditoría
DROP POLICY IF EXISTS "Permitir logs públicos" ON push_logs;
CREATE POLICY "Permitir logs públicos" 
ON push_logs FOR INSERT 
WITH CHECK (true);

-- Asegurar que RLS esté activo pero con estas políticas de apertura
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;
`;

async function applyFix() {
  console.log('🤖 Iniciando Migración de Políticas RLS (Modo Automatización)...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql
  });

  if (error) {
    console.error('❌ Error fatal al ejecutar RPC exec_sql:', error.message);
    console.log('💡 Intentando alternativa directa si el RPC no existe...');
    // Si falla el RPC, avisar al usuario.
  } else {
    console.log('✅ Políticas aplicadas con éxito a push_subscriptions y push_logs.');
  }
}

applyFix();
