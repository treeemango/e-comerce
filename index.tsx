import React from 'react';
import ReactDOM from 'react-dom/client';
import ResponsiveApp from './ResponsiveApp';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ResponsiveApp />
    </ErrorBoundary>
  </React.StrictMode>
);

// PWA: service worker registration (offline caching + push)
// IMPORTANT: Do NOT run the SW in Vite dev.
// It can intercept Vite's module URLs (e.g. /@fs/...) and break dynamic imports.
if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    const key = 'dev_sw_unregistered_v1';
    // Best-effort cleanup if a SW was previously registered.
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      const didUnregister = await Promise.all(regs.map((r) => r.unregister()));
      const any = didUnregister.some(Boolean);
      if (any && sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1');
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        window.location.reload();
      }
    }).catch(() => {
      // ignore
    });
  }
} else if ('serviceWorker' in navigator) {
  const swUrl = '/sw.js';
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}