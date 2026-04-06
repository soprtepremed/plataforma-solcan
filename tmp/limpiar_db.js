import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- 1. Eliminar el trigger que está rompiendo el sistema por culpa de pg_net
DROP TRIGGER IF EXISTS on_new_notification ON public.notificaciones;

-- 2. Asegurarnos que la tabla notificaciones exista
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  metadata JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear el trigger de nuevo de forma segura (sin pg_net por ahora)
-- Usaremos una solución de respaldo para enviar la señal a Vercel
`;

async function clean() {
  console.log('🧹 Limpiando disparadores erróneos en la base de datos...');
  const { error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) console.error('❌ Error limpiando base de datos:', error.message);
  else console.log('✅ Base de datos limpia de errores. Listos para enviar.');
}

clean();
