import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkDevice() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('device_name, created_at')
    .order('created_at', { ascending: false });

  if (error) console.error(error.message);
  else {
    console.log(`✅ ¡ÉXITO! He detectado ${data.length} dispositivos para Alejandro:`);
    data.forEach((d, i) => {
      console.log(`${i + 1}. [${d.device_name}] - Registrado el: ${d.created_at}`);
    });
  }
}

checkDevice();
