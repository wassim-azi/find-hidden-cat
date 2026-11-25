/**
 * PWA Installation Detection, Android Chrome `beforeinstallprompt` Capture,
 * iOS Safari Add-to-Home-Screen Detection, and Non-Intrusive Dismissal Tracking.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PwaInstallState {
  isInstalled: boolean;
  canPromptNative: boolean;
  isIosSafari: boolean;
  dismissed: boolean;
}

const INSTALL_PREF_KEY = 'meowdoku_pwa_install_v1';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let initialized = false;
const listeners = new Set<(state: PwaInstallState) => void>();

export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mqStandalone =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches);
  const iosStandalone =
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mqStandalone || iosStandalone;
}

export function detectIsIosSafari(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);
  const isNonSafariIos = /CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return isIos && isWebKit && !isNonSafariIos;
}

export function isInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INSTALL_PREF_KEY) === 'dismissed';
  } catch {
    return false;
  }
}

export function markInstallDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INSTALL_PREF_KEY, 'dismissed');
  } catch {
    // Ignore
  }
  emit();
}

export function getPwaInstallState(): PwaInstallState {
  return {
    isInstalled: installedFlag || detectIsStandalone(),
    canPromptNative: deferredPrompt !== null,
    isIosSafari: detectIsIosSafari(),
    dismissed: isInstallDismissed(),
  };
}

function emit(): void {
  const snapshot = getPwaInstallState();
  for (const cb of listeners) {
    cb(snapshot);
  }
}

export function subscribePwaInstall(
  cb: (state: PwaInstallState) => void
): () => void {
  listeners.add(cb);
  cb(getPwaInstallState());
  return () => listeners.delete(cb);
}

export function initPwaInstallCapture(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  installedFlag = detectIsStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferredPrompt = null;
    emit();
  });

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        installedFlag = true;
        deferredPrompt = null;
        emit();
      }
    };
    mq.addEventListener?.('change', onChange);
  }
}

/**
 * Triggers the native browser installation dialog on Android Chrome / Edge / supported browsers.
 */
export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      installedFlag = true;
    } else {
      markInstallDismissed();
    }
    emit();
    return choice.outcome;
  } catch {
    emit();
    return 'unavailable';
  }
}
