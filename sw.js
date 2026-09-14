// 版本 v6 - 強制清除所有舊快取
const CACHE_NAME = 'yibao-v6';

// 安裝時：清除所有舊快取，立即接管
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k))) // 清除全部快取
    ).then(() => self.clients.claim())
  );
});

// 不快取任何東西，永遠從網路取得最新版
self.addEventListener('fetch', e => {
  if (e.request.url.includes('script.google.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('gstatic.com')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
