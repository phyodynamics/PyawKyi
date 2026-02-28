// Service Worker for Web Push Notifications — PyawKyi
// This runs in the background even when the tab is closed

self.addEventListener("push", (event) => {
  let data = {
    title: "PyawKyi",
    body: "You have a new notification",
    type: "info",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    // fallback to default
  }

  const icons = { info: "ℹ️", update: "🚀", promo: "🎉", alert: "⚠️" };
  const icon = icons[data.type] || "ℹ️";

  const options = {
    body: data.body || data.message,
    icon: "/pyaw_kyi.png",
    badge: "/pyaw_kyi_favi.png",
    tag: data.id || "pyawkyi-notification",
    data: { url: self.registration.scope },
    vibrate: [200, 100, 200],
    actions: [{ action: "open", title: "Open PyawKyi" }],
  };

  event.waitUntil(
    self.registration.showNotification(`${icon} ${data.title}`, options),
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a PyawKyi tab is already open, focus it
        for (const client of clientList) {
          if (
            client.url.includes(self.registration.scope) &&
            "focus" in client
          ) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(self.registration.scope);
        }
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
