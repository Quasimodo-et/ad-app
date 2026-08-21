// ============================================================
// 特应性皮炎记录工具 —— Service Worker（离线缓存）
// 作用：网页被"安装"到手机/电脑桌面后，即使没有网络也能打开
// ============================================================

const CACHE_NAME = "ad-tracker-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./body-map.png",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

// 安装时：先把核心文件缓存起来
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 激活时：清理旧版本的缓存
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 请求处理：
// - 打开页面时优先走网络（保证拿到最新版本），断网时退回缓存
// - 图片等静态文件优先用缓存，没有再去网络并顺手存进缓存
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  // 页面导航请求：网络优先，离线时用缓存的首页
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(function (response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // 其他请求：缓存优先，缓存没有再去网络
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
