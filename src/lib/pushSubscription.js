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
    console.warn('Este navegador no soporta Notificaciones Push.');
    return;
  }

  try {
    // 1. Obtener registro del Service Worker
    const registration = await navigator.serviceWorker.ready;

    // 2. Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado.');
      return;
    }

    // 3. Suscribirse al servicio de Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Suscripción generada con éxito:', subscription);

    // 4. Guardar en Supabase (Upsert por suscripción para evitar duplicados en el mismo navegador)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription, // Supabase guardará este objeto JSON directamente
        device_name: `${navigator.userAgent} [Ref. ${new Date().toLocaleTimeString()}]`
      }, { onConflict: 'subscription' });

    if (error) {
      console.error('Error al guardar suscripción en Supabase:', error);
      return false;
    } else {
      console.log('Dispositivo registrado en la nube de Solcan.');
      return true;
    }

  } catch (error) {
    console.error('Error durante el registro de Push:', error);
    return false;
  }
}
