import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './styles/index.css';
import App from './App';
import { initPwaInstallCapture } from './services/pwaInstall';
import { registerServiceWorker } from './services/swManager';
import { recoverPersistedStateFromIDB } from './utils/storage';

initPwaInstallCapture();
registerServiceWorker();
void recoverPersistedStateFromIDB();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
