// TaskFlow service worker. Plain JavaScript served from /sw.js.
//
// Cache strategy by request kind, all same-origin GET only:
//   - navigations: network-first, so a fresh shell wins online, falling back to
//     the cached response and then to the cached root for offline reloads.
//   - /_next/static assets and static files: cache-first, since their names are
//     content-hashed and safe to keep.
//   - other GETs: network-first with a cache fallback.
//
// Bumping CACHE_VERSION is how a new build replaces the previous cache: the
// activate handler deletes every cache whose name is not the current one.

const CACHE_VERSION = "taskflow-v1";

const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".mjs",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
];

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) {
    return true;
  }
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_VERSION)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// Push notification event listener
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: "TaskFlow Commitment Due",
        body: event.data.text() || "You have a Follow Up commitment due.",
      };
    }
  }

  const title = payload.title || "TaskFlow Commitment Due";
  const data = payload.data || {};
  const tag = payload.tag || (data.followupId ? `followup_${data.followupId}` : "taskflow_notification");

  const options = {
    body: payload.body || "You have a Follow Up commitment due.",
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    tag,
    data,
    requireInteraction: true,
    actions: payload.actions || [
      { action: "view", title: "View Follow Up" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click and launcher routing
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  const launcherUri = data.launcherUri;
  const targetUrl = data.url || (data.followupId ? `/followups?id=${encodeURIComponent(data.followupId)}` : "/followups");

  event.waitUntil(
    (async () => {
      // If the user clicked a direct communication action (email, phone, whatsapp)
      // and launcherUri exists, open the launcher directly
      if ((action === "email" || action === "whatsapp" || action === "phone" || action === "launch") && launcherUri) {
        if (self.clients.openWindow) {
          try {
            await self.clients.openWindow(launcherUri);
            return;
          } catch {
            // If direct launcher protocol fails in browser, fall back to app window
          }
        }
      }

      // Check existing browser windows for TaskFlow
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      // If no existing window is open, open a new window to target route
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
