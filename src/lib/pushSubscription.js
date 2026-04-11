import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = "BDQcmHxsTZt5zXvSixGMkwgFhOYM0q7nJ76Xr11MAZidIOl7T-UGYpA-LwDtVARJwMNwwiXgjqu_IRjqhCmwfY4";

/**
 * Convierte una llave VAPID Base64 en un formato compatible con el navegador.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Solicita permisos y suscribe al navegador actual para notificaciones Push.
 * @param {string} userId - ID del usuario actual en Supabase.
 */
export async function subscribeUserToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('❌ Este navegador NO soporta notificaciones Push.');
    return false;
  }

  try {
    alert('🔍 Paso 1: Buscando Service Worker...');
    const registration = await navigator.serviceWorker.ready;

    alert('🔔 Paso 2: Solicitando permiso al sistema...');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('⚠️ Permiso denegado. Actívalo en los ajustes de tu navegador.');
      return false;
    }

    alert('📡 Paso 3: Generando suscripción (VAPID)...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    alert('☁️ Paso 4: Sincronizando con Solcan...');
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription, 
        device_name: `${navigator.userAgent} [Ref. ${new Date().toLocaleTimeString()}]`
      }, { onConflict: 'subscription' });

    if (error) {
      alert('❌ Error al guardar en base de datos: ' + error.message);
      return false;
    } else {
      alert('✅ ¡ÉXITO! Suscripción confirmada.');
      return true;
    }

  } catch (error) {
    alert('🚨 ERROR: ' + error.message);
    return false;
  }
}
