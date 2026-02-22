const CACHE_NAME = "hexapath-v1";
const OFFLINE_URL = "/offline";

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline - HexaPath</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
      text-align: center;
    }
    main {
      max-width: 420px;
    }
    .icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }
    h2 {
      margin: 0 0 0.5rem 0;
    }
    p {
      margin: 0 0 1rem 0;
      color: #334155;
    }
    a {
      display: inline-block;
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <main>
    <div class="icon">📡</div>
    <h2>You're offline</h2>
    <p>Reconnect to continue playing HexaPath.</p>
    <a href="/" onclick="location.reload(); return false;">Retry</a>
  </main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.put(
          OFFLINE_URL,
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;
  if (event.request.destination !== "document") return;

  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
