// Service Worker for PWA functionality
const CACHE_NAME = 'aliveagain-v1';
const urlsToCache = [
    '/',
    '/index.optimized.html',
    '/style.min.css',
    '/script.min.js',
    '/chat.html',
    '/public-chat.html',
    '/chat.css',
    '/public-chat.css',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;600&display=swap',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
