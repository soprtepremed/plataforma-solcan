import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybhfsvkwpmhzwuboynre.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaGZzdmt3cG1oend1Ym95bnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTM1MzEsImV4cCI6MjA5MDMyOTUzMX0.sBEHzl_Rc8U9xwR9Gf9LJi1a20WVk2mjO1StI1mN6wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function triggerBlindBroadcast() {
  console.log('📡 Iniciando Simulacro de Broadcast Ciego...');
  
  // 1. Insertar en tabla de notificaciones (para Realtime)
  const { data, error } = await supabase
    .from('notificaciones')
    .insert([
      {
        role: 'admin',
        title: '🚨 ALERTA DE SISTEMA: RECOLECCIÓN',
        message: 'Esta es una prueba de broadcast ciego v2.1. El sistema debería sonar ahora.',
        type: 'info'
      }
    ])
    .select();

  if (error) {
    console.error('❌ Error al insertar notificación:', error.message);
  } else {
    console.log('✅ Notificación insertada con éxito (ID: ' + data[0].id + ')');
    console.log('⏳ Esperando 2 segundos para el impacto del sonido...');
  }

  // 2. Opcional: Invocar Edge Function (para Push real si el usuario está suscrito)
  // Nota: Esto requiere que el usuario haya encendido el Switch en Localhost
  console.log('📡 Invocando Edge Function de Push...');
  const { data: funcData, error: funcError } = await supabase.functions.invoke('push-notifications', {
    body: {
      record: {
        role: 'admin',
        title: '📦 Solcan: Envío Programado',
        message: 'Tu dispositivo local ha recibido esta alerta de fondo.',
        metadata: { url: '/logistica/envio' }
      }
    }
  });

  if (funcError) console.error('⚠️ Error en Edge Function (posiblemente falta permiso):', funcError.message);
  else console.log('✅ Edge Function respondio:', funcData);
}

triggerBlindBroadcast();
