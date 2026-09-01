// Service Worker — Lab IUCMC PWA
// Push notifications + manejo de clics + instalación
const CACHE = "lab-iu-cmc-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// ── Notificaciones push ──
self.addEventListener("push", (event) => {
  let data = { title: "Lab IUCMC", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.jpg",
      badge: "/icons/icon-192.jpg",
      data: { url: data.url },
      tag: data.tag || "lab-iu",
      renotify: !!data.tag,
    })
  );
});

// Clic en la notificación → abrir/focus la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (new URL(c.url).pathname === new URL(url, self.location.origin).pathname) {
          return c.navigate(url).then(() => c.focus());
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
