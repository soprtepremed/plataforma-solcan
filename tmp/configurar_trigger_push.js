import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- Habilitar extensión net si no existe
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear o actualizar la función que llama a la Edge Function
CREATE OR REPLACE FUNCTION public.notify_push_subscribers()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT := 'https://ybhfsvkwpmhzwuboynre.supabase.co';
  function_token TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
BEGIN
  -- Intentamos enviar a la Edge Function
  PERFORM
    net.http_post(
      url := project_url || '/functions/v1/push-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || function_token
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reiniciar el trigger
DROP TRIGGER IF EXISTS on_new_notification ON public.notificaciones;
CREATE TRIGGER on_new_notification
  AFTER INSERT ON public.notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_subscribers();
`;

async function run() {
  console.log('🔗 Configurando disparador de notificaciones (Trigger + pg_net)...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  
  if (error) {
    console.error('❌ Error configurando trigger:', error);
  } else {
    console.log('✅ Disparador configurado con éxito.');
  }
}

run();
