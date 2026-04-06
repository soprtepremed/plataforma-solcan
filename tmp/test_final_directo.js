import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc1MzUzMSwiZXhwIjoyMDkwMzI5NTMxfQ.m8XtxtGy0O4oMihm03bWSjn-hTFZUdNQtxVzmux53GU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function finalTest() {
  console.log('🧐 Buscando a Alejandro (Pixel 7)...');
  
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (subError || !subs || subs.length === 0) {
    console.log('⚠️ No hay dispositivos. ¡Regístrate de nuevo!');
    return;
  }

  const targetId = subs[0].user_id;
  console.log('🚀 Lanzando notificación DIRECTA a:', targetId);

  // 1. Insertamos en el historial (UI)
  await supabase.from('notificaciones').insert([{
    user_id: targetId,
    title: '🔔 Alerta de Solcan',
    message: 'Esta es una notificación de prueba directa.',
    type: 'success'
  }]);

  // 2. LLAMADA MANUAL A LA FUNCIÓN DE NOTIFICACIONES (BYPASS TRIGGER)
  const { data, error: functionError } = await supabase.functions.invoke('push-notifications', {
    body: {
      record: {
        user_id: targetId,
        title: '🛎️ Prueba de Solcan',
        message: '¡Excelente! Todo el sistema está configurado y funcionando. Ya puedes recibir alertas de ruta.',
        metadata: { url: '/' }
      }
    }
  });


  if (functionError) {
    console.error('❌ Error llamando a la función:', functionError);
  } else {
    console.log('✅ Señal de Push enviada con éxito. ¡VIBRA!', JSON.stringify(data));
    console.log('\nSi ya te vibró el Pixel 7, ¡dime!');
  }
}

finalTest();
