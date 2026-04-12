import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store'; // << Importación faltante agregada
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

// Configurar cómo se manejan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Se mantiene por compatibilidad
    shouldShowBanner: true, // Nuevo estándar
    shouldShowList: true,   // Nuevo estándar
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId) {
  let token;

  // 1. Configurar Canales para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  // 2. Solicitar permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('🛡️ Escudo: Permiso denegado por el usuario.');
    return null;
  }

  // 3. Obtener el token de Expo
  try {
    const projectId = "35d92ad5-2c11-4c9e-80f8-65ea2cf17b4e";
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    })).data;
    
    // --- CAPA DE ESCUDO 1: Validación de Formato ---
    if (!token || !token.startsWith('ExponentPushToken')) {
      console.log('🛡️ Escudo: Token inválido omitido.');
      return null;
    }

    // --- CAPA DE ESCUDO 2: Prevención de Redundancia ---
    const lastSavedToken = await SecureStore.getItemAsync('last_push_token');
    if (lastSavedToken === token) {
      console.log('🛡️ Escudo: El token ya está registrado en este dispositivo. Saltando paso.');
      return token;
    }

    console.log('✅ Nuevo Token Detectado:', token);

    // 4. Guardar en Supabase (Solo si tenemos userId y token)
    if (userId && token) {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ 
          user_id: userId, 
          token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        }, { onConflict: 'token' });

      if (error) {
        console.error('❌ Error al guardar en Supabase:', error.message);
      } else {
        console.log('🛡️ Escudo: Registro exitoso en Base de Datos.');
        // Guardar localmente para que la próxima vez el escudo bloquee el intento
        await SecureStore.setItemAsync('last_push_token', token);
      }
    }
  } catch (e) {
    console.error('🛡️ Escudo: Error crítico en obtención de token:', e);
  }

  return token;
}
