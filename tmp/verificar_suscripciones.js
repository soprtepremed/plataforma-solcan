import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSubs() {
  const { data, error } = await supabase.from('push_subscriptions').select('user_id, device_name').limit(5);
  if (error) {
    console.error('Error al verificar suscripciones:', error.message);
  } else {
    if (data.length === 0) {
      console.log('⚠️ No hay dispositivos suscritos. ¡Alguien debe entrar y activar notificaciones primero!');
    } else {
      console.log('📱 Dispositivos listos para recibir Push:', data.map(d => d.device_name || 'Desconocido').join(', '));
    }
  }
}

checkSubs();
