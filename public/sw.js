// Service Worker for Solcan Lab Notifications

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/favicon.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
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
    clients.openWindow(event.notification.data.url)
  );
});

// Listener para mensajes del cliente (Vite/Tab)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message, metadata } = event.data;
    self.registration.showNotification(title, {
      body: message,
      icon: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: 'solcan-notif'
    });
  }
});
