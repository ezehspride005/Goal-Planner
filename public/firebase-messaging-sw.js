// Goal Planner - Firebase Cloud Messaging & Web Push Service Worker
// Soft, calm, and supportive notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received in background
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
  const body = notification.body || "Here's today's plan. Take one mindful step at a time.";
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

// Notification clicked - focus or open window to Today's Plan or Weekly Check-in
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
