/**
 * 藥妝比價神器 — Service Worker
 * 每次部署自動更新，不需要手動清快取
 */

// ★ 每次更新程式碼時，把這個版本號加1 ★
const VERSION = 'v48';
const CACHE_NAME = 'price-app-' + VERSION;

// 安裝：快取核心檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
      ]).catch(() => cache.add('./index.html'));
    }).then(() => {
      // 立刻啟用新版，不等舊版關閉
      return self.skipWaiting();
    })
  );
});

// 啟用：清除所有舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 清除舊快取:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // 立刻接管所有頁面
      return self.clients.claim();
    })
  );
});

// Fetch：網路優先，快取備援
self.addEventListener('fetch', event => {
  const { request } = event;

  // 跳過非 GET 請求
  if (request.method !== 'GET') return;

  // 跳過 Chrome extension
  if (request.url.startsWith('chrome-extension://')) return;

  // Google Sheets / Apps Script 請求不快取，永遠走網路
  if (request.url.includes('script.google.com') ||
      request.url.includes('docs.google.com') ||
      request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // 成功取得新版，更新快取
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // 網路失敗，用快取版本
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // 完全離線時回傳主頁
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 接收訊息
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
