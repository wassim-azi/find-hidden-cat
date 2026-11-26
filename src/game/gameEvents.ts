import type { GameEvent } from './progressStats';

type Listener = (e: GameEvent) => void;

const listeners = new Set<Listener>();

/** Subscribes to gameplay events. Returns an unsubscribe function. */
export function onGameEvent(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Dispatches a gameplay event to all active listeners safely. */
export function emitToListeners(e: GameEvent): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(e);
    } catch {
      // Never allow one listener failure to disrupt gameplay or other listeners
    }
  }
}
