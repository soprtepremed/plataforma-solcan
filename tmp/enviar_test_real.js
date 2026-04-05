import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testPush() {
  console.log('🧐 Buscando el dispositivo más reciente para la prueba...');
  
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (subError || !subs || subs.length === 0) {
    console.log('⚠️ No encontré ningún dispositivo registrado. Asegúrate de haber iniciado sesión y activado notificaciones en tu celular.');
    return;
  }

  const targetId = subs[0].user_id;
  console.log('🚀 Lanzando notificación de prueba al usuario:', targetId);

  const { error: notifError } = await supabase
    .from('notificaciones')
    .insert([{
      user_id: targetId,
      title: '🛎️ Prueba de Solcan',
      message: '¡Excelente! Tu sistema de notificaciones de segundo plano ya está funcionando al 100%.',
      type: 'success',
      metadata: { source: 'test' }
    }]);

  if (notifError) {
    console.error('❌ Error al crear la notificación:', notifError.message);
  } else {
    console.log('✅ Notificación insertada con éxito. Revisa tu celular ahora.');
  }
}

testPush();
