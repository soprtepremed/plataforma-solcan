import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixNow() {
  const sql = `
    -- Si la tabla no está en pg_class, algo está pasando con la esquema
    -- Intentemos ver si existe sin RLS para descartar permisos
    ALTER TABLE IF EXISTS public.push_subscriptions DISABLE ROW LEVEL SECURITY;
    
    -- Insertemos un dato manual desde aquí arriba para ver si funciona
    INSERT INTO public.push_subscriptions (user_id, subscription, device_name)
    VALUES ('e147b36f-897c-48be-8f92-a9b08491c3de', '{"endpoint": "test"}'::jsonb, 'TEST-REMOTO')
    ON CONFLICT DO NOTHING;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) console.error('Error al forzar tabla:', error.message);
  else console.log('✅ RLS desactivado temporalmente para pruebas. Verifica ahora.');
}

fixNow();
