// Service Worker for Solcan Lab Notifications (Hardened Version)

self.addEventListener('push', function(event) {
  console.log('📬 Nueva señal de Push recibida!');
  
  let data = {
    title: '🛎️ Alerta Solcan',
    message: 'Tienes una nueva actualización en tu ruta.',
    url: '/'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('⚠️ Error al leer datos de Push, usando respaldo:', e);
  }

  const options = {
    body: data.message,
    icon: '/favicon.png', // Asegúrate que exista en /public
    badge: '/favicon.svg',
    vibrate: [300, 100, 400, 100, 300], // Vibración más notable
    tag: 'solcan-notif-v1', // Evita duplicados
    renotify: true, // Avisa incluso si ya hay una igual
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver Ruta' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Si ya hay una ventana abierta, la enfocamos
      for (const client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // O abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Listener para mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message } = event.data;
    self.registration.showNotification(title, {
      body: message,
      icon: '/favicon.png',
      vibrate: [200, 100, 200]
    });
  }
});
