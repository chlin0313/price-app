importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'yibao-card-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

firebase.initializeApp({
  apiKey: "AIzaSyAUXavqstoz5vQQI1a6hazwiwIWYNtKsS4",
  authDomain: "yibao-assistant.firebaseapp.com",
  projectId: "yibao-assistant",
  storageBucket: "yibao-assistant.firebasestorage.app",
  messagingSenderId: "41120731357",
  appId: "1:41120731357:web:703e770c6710f410b2cb34"
});

const messaging = firebase.messaging();

// 背景收到推播時顯示通知
messaging.onBackgroundMessage(payload => {
  const { title, body, icon, tag, data } = payload.notification || {};
  self.registration.showNotification(title || '宜寶管家', {
    body: body || '',
    icon: icon || './icon-192.png',
    badge: './icon-192.png',
    tag: tag || payload.data?.tag || 'yibao-fcm',
    requireInteraction: true,
    vibrate: [300, 100, 300],
    data: { url: data?.url || './', ...(payload.data || {}) }
  });
});

// 點通知開啟 App
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Cache
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('script.google.com') ||
      e.request.url.includes('firebaseapp.com') ||
      e.request.url.includes('googleapis.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (e.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
