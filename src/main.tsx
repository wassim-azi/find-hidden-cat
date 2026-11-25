import './i18n';
import './styles/index.css';
import { initPwaInstallCapture } from './services/pwaInstall';
import { registerServiceWorker } from './services/swManager';
import { recoverPersistedStateFromIDB } from './utils/storage';

initPwaInstallCapture();
registerServiceWorker();

/** Never block first paint for long if IndexedDB is slow or unavailable. */
const RECOVERY_TIMEOUT_MS = 1500;

async function boot(): Promise<void> {
  // Restore progress from the IndexedDB mirror BEFORE the game store loads LocalStorage,
  // otherwise the recovered save would be overwritten by the default state.
  await Promise.race([
    recoverPersistedStateFromIDB().catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, RECOVERY_TIMEOUT_MS)),
  ]);

  const [{ StrictMode, createElement }, { createRoot }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./App'),
  ]);

  createRoot(document.getElementById('root')!).render(
    createElement(StrictMode, null, createElement(App))
  );
}

void boot();
