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
    await supabase.functions.invoke('push-notifications', {
      body: {
        record: { role, user_id, title, message, metadata }
      }
    });
  } catch (err) {
    // No-op: No bloqueamos el flujo principal si la notificación push falla
    console.warn('⚠️ Push silencioso (no crítico):', err.message);
  }
}
