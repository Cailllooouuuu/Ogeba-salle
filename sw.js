// OGEBA Salle : fonctionne hors connexion et affiche les notifications.
const VERSION = 'ogeba-salle-1.4';
const FICHIERS = ['./', 'index.html', 'style.css?v=3', 'app.js?v=5', 'manifest.webmanifest',
  'icones/icone-192.png', 'icones/icone-512.png', 'icones/badge-96.png', 'icones/logo-ogeba.png', 'icones/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fichiers de l'application : le réseau d'abord (toujours la dernière version), la copie si le réseau manque.
// Les données (Supabase) ne passent pas par ici.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return rep;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { titre: 'OGEBA Salle', corps: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'OGEBA Salle', {
    body: d.corps || '',
    icon: 'icones/icone-192.png',
    badge: 'icones/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || './' },
    lang: 'fr',
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenetres => {
    for (const f of fenetres) {
      if (f.url.startsWith(self.registration.scope) && 'focus' in f) {
        const jour = /jour=(\d{4}-\d{2}-\d{2})/.exec(cible);
        if (jour) f.postMessage({ jour: jour[1] });
        return f.focus();
      }
    }
    return self.clients.openWindow(cible);
  }));
});
