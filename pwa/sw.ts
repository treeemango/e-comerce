/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<any>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback to index.html
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//,
      /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/i,
    ],
  })
);

// Same-origin pages/assets: prefer network, fallback cache
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
  })
);

// Images (any origin)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 14 * 24 * 60 * 60 })],
  })
);

// Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
);

// Push notifications (Android Chrome)
self.addEventListener('push', (event: PushEvent) => {
  const data = (() => {
    try {
      return event.data?.json?.() ?? {};
    } catch {
      return { body: event.data?.text?.() };
    }
  })() as any;

  const title = data.title || 'JuaExpress';
  const body = data.body || data.message || 'You have an update.';
  const buildUrlFromData = (payload: any) => {
    const params = new URLSearchParams();
    const target = payload.target || payload?.metadata?.target;
    const targetId = payload.id || payload?.metadata?.id;

    // Backward/alternative payload shapes
    const productId = payload.product_id || payload.productId || payload?.metadata?.product_id;
    const orderId = payload.order_id || payload.orderId || payload?.metadata?.order_id;
    const conversationId = payload.conversation_id || payload.conversationId || payload?.metadata?.conversation_id;
    const vendorId = payload.vendorId || payload.vendor_id || payload?.metadata?.vendorId;
    const view = payload.view || payload?.metadata?.view;
    const tab = payload.tab || payload?.metadata?.tab;
    const section = payload.section || payload?.metadata?.section;

    // Target-based deep links (when view/product/order ids are not provided)
    if (!view && typeof target === 'string') {
      if (target === 'wishlist') params.set('view', 'wishlist');
      if (target === 'coupons') {
        params.set('view', 'account-page');
        params.set('section', 'Coupon codes');
      }
      if (target === 'seller-orders') {
        params.set('view', 'seller-dashboard');
        params.set('tab', 'manage-orders');
      }
      if (target === 'inventory') {
        params.set('view', 'seller-dashboard');
        params.set('tab', 'manage-products');
      }
      if (target === 'finances') {
        params.set('view', 'seller-dashboard');
        params.set('tab', 'finances');
      }
      if (target === 'deals') params.set('view', 'deals');
      if (target === 'seller-dashboard') params.set('view', 'seller-dashboard');
      if (target === 'account-page') params.set('view', 'account-page');
      if (target === 'chat') params.set('chat_id', String(targetId || 'inbox'));
      if (target === 'product' && targetId) params.set('product_id', String(targetId));
      if (target === 'order' && targetId) params.set('order_id', String(targetId));
    }

    if (typeof view === 'string' && view.length > 0) params.set('view', view);
    if (typeof tab === 'string' && tab.length > 0) params.set('tab', tab);
    if (typeof section === 'string' && section.length > 0) params.set('section', section);
    if (productId) params.set('product_id', String(productId));
    if (orderId) params.set('order_id', String(orderId));
    if (conversationId) params.set('chat_id', String(conversationId));
    if (vendorId) params.set('vendorId', String(vendorId));

    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const url = data.url || buildUrlFromData(data);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data as any)?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        const windowClient = client as WindowClient;
        if ('focus' in windowClient) {
          await windowClient.focus();
          windowClient.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
