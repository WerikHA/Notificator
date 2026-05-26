const CACHE_NAME = 'notification-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap' // Opcional, se usar fontes externas
];

// Instalação: Cache dos arquivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache aberto');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estratégia Network First (Tenta rede, senão usa cache)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API e extensões
  if (event.request.url.includes('/api/') || event.request.url.includes('chrome-extension')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache se a resposta for válida
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback para o cache se estiver offline
        return caches.match(event.request);
      })
  );
});