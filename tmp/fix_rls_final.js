import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- 1. Asegurar la tabla
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- 2. Habilitar RLS explícitamente
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Borrar basura y crear política limpia
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Only owners can manage subscriptions" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_owner_all" 
ON public.push_subscriptions
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Dar permisos básicos (aunque RLS mande)
GRANT ALL ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
`;

async function run() {
  console.log('🛡️ Re-configurando permisos RLS de forma agresiva...');
  const { error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) {
    console.error('❌ Error configurando RLS:', error.message);
  } else {
    console.log('✅ Políticas RLS de push_subscriptions re-instaladas.');
  }
}

run();
