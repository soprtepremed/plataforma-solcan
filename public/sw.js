// Service Worker for Solcan Lab Notifications (v2.1 - Ultra Force)

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forzar actualización inmediata
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Tomar control de las pestañas al instante
});

self.addEventListener('push', function(event) {
  console.log('📬 ¡Llegó un mensaje real de Solcan!');
  
  let data = {
    title: 'Solcan: Nueva Recolección',
    message: 'Tienes una actualización en tu bitácora de ruta.',
    url: '/'
  };

  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    }
  } catch (e) {
    console.error('⚠️ Usando mensaje por defecto:', e);
  }

  const options = {
    body: data.message,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40], // Vibración extendida
    tag: 'solcan-alert-' + Date.now(), // Forzar nueva notificación siempre
    requireInteraction: true, // No se quita hasta que la toques
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      const activeClient = clientsArr.find(c => c.visibilityState === 'visible');
      if (activeClient) {
        return activeClient.focus();
      } else {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
