import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- Intentar habilitar extensión net (requiere permisos de superusuario en RPC, o que ya esté activa)
-- Si falla aquí, se ignora y se sigue con las funciones.
DO $$ 
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear la extensión pg_net (posiblemente falta de permisos en RPC), asumiendo que ya está habilitada.';
  END;
END $$;

-- Función para llamar a la Edge Function de Push
CREATE OR REPLACE FUNCTION public.notify_push_subscribers()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT := 'https://ybhfsvkwpmhzwuboynre.supabase.co';
  function_token TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';
BEGIN
  -- Usamos net.http_post proporcionado por la extensión pg_net
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

-- Trigger sobre la tabla de notificaciones
DROP TRIGGER IF EXISTS on_new_notification ON public.notificaciones;
CREATE TRIGGER on_new_notification
  AFTER INSERT ON public.notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_subscribers();
`;

async function run() {
  console.log('🔗 Solicitando configuración de Trigger en Supabase remoto...');
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  
  if (error) {
    console.error('❌ Error configurando trigger:', error.message);
  } else {
    console.log('✅ Trigger configurado correctamente en el servidor.');
  }
}

run();
