/**
 * Service Worker Registration, Safe Non-Interrupting Update Manager,
 * Offline Status Detector, and Lazy Chunk Pre-warmer.
 */

type UpdateListener = (updateReady: boolean) => void;
type RouteListener = (route: string) => void;

let registrationRef: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let updateReadyFlag = false;
const updateListeners = new Set<UpdateListener>();
const routeListeners = new Set<RouteListener>();
let reloadingForUpdate = false;

function notifyUpdateListeners(): void {
  for (const cb of updateListeners) {
    cb(updateReadyFlag);
  }
}

export function onSwUpdateStatus(cb: UpdateListener): () => void {
  updateListeners.add(cb);
  cb(updateReadyFlag);
  return () => updateListeners.delete(cb);
}

export function onSwRouteMessage(cb: RouteListener): () => void {
  routeListeners.add(cb);
  return () => routeListeners.delete(cb);
}

export function getSwRegistration(): ServiceWorkerRegistration | null {
  return registrationRef;
}

export function isSwUpdateReady(): boolean {
  return updateReadyFlag;
}

/**
 * Applies a waiting Service Worker update ONLY when the user explicitly confirms
 * or when outside an active puzzle so gameplay is never interrupted.
 */
export function applyPendingSwUpdate(): void {
  if (!waitingWorker) return;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Registers the Service Worker in production builds and wires safe update detection
 * + notification click route messages.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; route?: string } | undefined;
    if (data?.type === 'OPEN_ROUTE' && typeof data.route === 'string') {
      for (const cb of routeListeners) {
        cb(data.route);
      }
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return;
    if (updateReadyFlag) {
      reloadingForUpdate = true;
      window.location.reload();
    }
  });

  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registrationRef = reg;

        if (reg.waiting) {
          waitingWorker = reg.waiting;
          updateReadyFlag = true;
          notifyUpdateListeners();
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              waitingWorker = installing;
              updateReadyFlag = true;
              notifyUpdateListeners();
            }
          });
        });

        // Wait until the SW is truly active (even on first visit!) then cache all loaded /assets/* chunks
        void navigator.serviceWorker.ready.then(() => {
          precacheLoadedAppAssets();
        });
      })
      .catch(() => {
        // Gracefully ignore in restricted sandboxes
      });
  });
}

/**
 * Sends all currently loaded same-origin Vite /assets/* JS & CSS files to the active
 * Service Worker so even the very first online visit becomes 100% offline-ready immediately.
 */
export function precacheLoadedAppAssets(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready
    .then((readyReg) => {
      if (!readyReg.active) return;
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const urlSet = new Set<string>();
      for (const e of entries) {
        try {
          const u = new URL(e.name);
          if (u.origin === window.location.origin && u.pathname.startsWith('/assets/')) {
            urlSet.add(u.pathname);
          }
        } catch {
          // Ignore invalid URLs
        }
      }
      // Also inspect script & stylesheet DOM tags directly
      document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="modulepreload"]').forEach((el) => {
        const raw = el.getAttribute('src') || el.getAttribute('href');
        if (!raw) return;
        try {
          const u = new URL(raw, window.location.origin);
          if (u.origin === window.location.origin && u.pathname.startsWith('/assets/')) {
            urlSet.add(u.pathname);
          }
        } catch {
          // Ignore
        }
      });
      if (urlSet.size > 0) {
        readyReg.active.postMessage({
          type: 'PRECACHE_URLS',
          urls: Array.from(urlSet),
        });
      }
    })
    .catch(() => undefined);
}
