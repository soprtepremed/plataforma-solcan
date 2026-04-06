import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function masterFix() {
  const sql = `
    -- Crear tabla de logs para espiar qué pasa por dentro
    CREATE TABLE IF NOT EXISTS public.push_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      message TEXT,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Limpiar suscripciones viejas corruptas de Alejandro
    -- (Opcional, pero para que no haya duda) 
    -- DELETE FROM public.push_subscriptions;
  `;
  
  console.log('🏗️ Creando consola de diagnóstico (push_logs)...');
  await supabase.rpc('exec_sql', { query_text: sql });
  console.log('✅ Consola de diagnóstico lista. Ahora sabré qué le pasa a Google.');
}

masterFix();
