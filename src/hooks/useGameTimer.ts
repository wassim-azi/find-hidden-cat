import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameTimer(): void {
  const tickTimer = useGameStore((s) => s.tickTimer);

  useEffect(() => {
    const id = window.setInterval(() => {
      tickTimer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [tickTimer]);
}
