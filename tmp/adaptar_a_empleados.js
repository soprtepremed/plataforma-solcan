import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- 1. Re-crear la tabla adaptada a tu sistema de empleados
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Quitamos el REFERENCES auth.users para que acepte tus IDs de empleados
  subscription JSONB NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- 2. Desactivar RLS para que el sistema de PIN pueda escribir sin problemas
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;

-- 3. Asegurar permisos de escritura para la llave anon
GRANT ALL ON public.push_subscriptions TO anon;
GRANT ALL ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
`;

async function run() {
  console.log('🔧 Adaptando sistema de Push a tabla "empleados"...');
  const { error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) console.error('❌ Error adaptando tabla:', error.message);
  else console.log('✅ Sistema adaptado con éxito. Ya puedes registrarte.');
}

run();
