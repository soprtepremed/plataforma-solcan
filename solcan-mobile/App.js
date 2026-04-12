import React from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import CourierDashboard from './src/screens/CourierDashboard';
import LogisticaBitacoraMobile from './src/screens/LogisticaBitacoraMobile';
import Sidebar from './src/components/Sidebar';
import { View, ActivityIndicator, Alert, Platform, Vibration } from 'react-native';
import { theme } from './src/styles/theme';
import { registerForPushNotificationsAsync } from './lib/notifications';
import * as Notifications from 'expo-notifications';
import { supabase } from './lib/supabase';

function NavigationWrapper() {
  const { user, loading, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = React.useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  React.useEffect(() => {
    if (user) {
      // 1. Solicitar Permisos y Guardar Token
      registerForPushNotificationsAsync(user.id);

      // 2. Configurar Canales para Android (Crucial para Vibración)
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // 1. Configurar Receptor de Tiempo Real (Bypass de Firebase)
      const channel = supabase
        .channel('notificaciones-reales')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificaciones',
            filter: `role=eq.mensajero`, // Escuchamos solo lo de mensajeros
          },
          (payload) => {
            const { role: notifRole, user_id, title, message, metadata } = payload.new;
            console.log('🔔 Nueva notificación detectada:', payload.new);
            
            // FILTRO DE IDENTIDAD:
            // 1. Si la notificación tiene un user_id y NO es el mío, la ignoramos.
            if (user_id && user_id !== user.id) {
              console.log('🤫 Ignorando notificación para otro usuario:', user_id);
              return;
            }

            // 2. Si es para el rol mensajero o para mi ID específico, la mostramos.
            if (notifRole === 'mensajero' || user_id === user.id) {
              // VIBRACIÓN FÍSICA INMEDIATA (Nativo)
              Vibration.vibrate([0, 500, 200, 500]);
              
              Notifications.scheduleNotificationAsync({
                content: {
                  title: title || 'Nueva Recolección',
                  body: message || 'Se ha registrado un nuevo envío.',
                  data: metadata || {},
                  sound: true,
                  vibrate: [0, 500, 200, 500], 
                  priority: Notifications.AndroidNotificationPriority.MAX,
                  channelId: 'default',
                },
                trigger: null, 
              });
            }
          }
        )
        .subscribe();

      // 2. Escuchar notificaciones recibidas en primer plano (para feedback visual)
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificación mostrada con éxito');
      });

      // 3. Escuchar cuando el usuario toca la notificación
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const { data } = response.notification.request.content;
        if (data?.sucursal) {
           Alert.alert('Detalle de Recolección', `Sucursal: ${data.sucursal}`);
        }
      });

      return () => {
        supabase.removeChannel(channel);
        if (notificationListener.current) notificationListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      };
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'dashboard' ? (
        <CourierDashboard onOpenMenu={() => setIsDrawerOpen(true)} onNavigate={setCurrentScreen} />
      ) : (
        <LogisticaBitacoraMobile onBack={() => setCurrentScreen('dashboard')} />
      )}

      <Sidebar 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onNavigate={setCurrentScreen}
        user={user}
        logout={logout}
      />
    </View>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationWrapper />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
