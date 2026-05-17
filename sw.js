/**
 * ════════════════════════════════════════════════════════
 *  台日比價神器 Pro — Service Worker (sw.js)
 *  PWA 離線快取，版本升級時自動更新
 * ════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'pricepro-v2';

// 要快取的資源（第一次載入後離線也能用）
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  // Google Fonts（網路版）
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Shippori+Mincho:wght@400;700;800&display=swap',
];

// ── 安裝：預先快取核心資源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(err => {
        console.warn('[SW] 部分預快取失敗（通常是字型網路問題）:', err);
        // 即使字型失敗也繼續安裝
        return cache.add('./index.html');
      });
    }).then(() => self.skipWaiting())
  );
});

// ── 啟用：清除舊版快取 ──
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
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：快取優先，網路備援 ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳過非同源的 API 請求（Google Sheets CSV、匯率等）
  if (url.origin !== location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return; // 讓瀏覽器直接處理
  }

  // 跳過 Chrome extension 請求
  if (request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // 背景更新（Stale While Revalidate）
        const fetchPromise = fetch(request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => null);

        return cached; // 立即回傳快取版本
      }

      // 沒有快取，直接網路請求
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        // 完全離線時，回傳主頁
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── 接收主頁推送的訊息 ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
