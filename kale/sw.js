// Şövalye Kalesi servis çalışanı: oyun bir kez açıldıktan sonra internetsiz de çalışır.
// Her dosya önce ağdan, tarayıcı önbelleği atlanarak istenir; böylece yeni sürüm yayımlanınca
// hemen görülür. Ağ yoksa son indirilen hal açılır.
const CACHE = 'kale-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // Sayfa hangi "?…" ya da "#…" ile açılırsa açılsın aynı dosyadır.
  const key = req.mode === 'navigate' ? self.registration.scope : url.origin + url.pathname;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
    return res;
  }).catch(async () => (await caches.match(key)) || Response.error()));
});
