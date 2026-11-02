// Goal Planner - Service Worker & Push Notification Handler
// Handles offline caching & push notifications for iOS and Android

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const notification = payload.notification || payload;
  const title = notification.title || 'Goal Planner 🌸';
  const body = notification.body || "Here's today's plan.";
  const targetTab = payload.data?.tab || notification.tab || 'daily';

  const options = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag || 'goal-planner-reminder',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: '/?tab=' + targetTab,
      tab: targetTab,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetTab = event.notification.data?.tab || 'daily';
  const targetUrl = '/?tab=' + targetTab;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE_TAB', tab: targetTab });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
