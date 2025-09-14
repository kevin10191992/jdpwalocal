const CACHE_NAME = 'jdownloader-remote-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // For API calls, always try network first
        if (event.request.url.includes('/api/') || 
            event.request.url.includes('/add') ||
            event.request.url.includes('/downloads') ||
            event.request.url.includes('/devices') ||
            event.request.url.includes('/packages')) {
          return fetch(event.request).catch(() => {
            // If network fails, return a custom offline response
            return new Response(
              JSON.stringify({ 
                error: 'Sin conexión a internet', 
                offline: true 
              }), 
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        }
        
        return fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for offline downloads
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-downloads') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Get pending downloads from IndexedDB and sync when online
  return self.registration.showNotification('JDownloader Remote', {
    body: 'Sincronizando descargas pendientes...',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png'
  });
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver descargas',
          icon: '/icons/action-explore.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/icons/action-close.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('JDownloader Remote', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app and navigate to downloads
    event.waitUntil(
      clients.openWindow('/?section=downloads')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
