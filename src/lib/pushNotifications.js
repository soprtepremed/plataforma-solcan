/**
 * Solcan - Push Notification Utility
 * Llama directamente a la Edge Function para enviar notificaciones push,
 * sin depender del disparador de la base de datos (pg_net).
 */

import { supabase } from './supabaseClient';

/**
 * Envía una notificación push a uno o varios destinatarios.
 * @param {Object} params
 * @param {string} [params.role] - Rol del destinatario (ej. 'mensajero', 'admin')
 * @param {string} [params.user_id] - ID de usuario específico (alternativo al role)
 * @param {string} params.title - Título de la notificación
 * @param {string} params.message - Cuerpo de la notificación
 * @param {Object} [params.metadata] - Datos adicionales (url, sucursal, etc.)
 */
export async function sendPushNotification({ role, user_id, title, message, metadata = {} }) {
  try {
    console.log('📡 Intentando enviar notificación Push...', { role, user_id, title });
    const { data, error } = await supabase.functions.invoke('push-notifications', {
      body: {
        record: { 
          role: role || 'mensajero', // Por defecto a mensajero si no viene nada
          user_id, 
          title, 
          message, 
          metadata 
        }
      }
    });
    
    if (error) console.error('❌ Error en Push:', error.message);
    else console.log('✅ Push enviado con éxito:', data);
  } catch (err) {
    console.warn('⚠️ Push silencioso (no crítico):', err.message);
  }
}

