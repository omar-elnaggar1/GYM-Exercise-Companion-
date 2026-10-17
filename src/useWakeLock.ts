// Keeps the screen on during a workout, so the timer stays visible.
import { useEffect } from 'react';

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock?.release();
      } catch {
        /* battery saver etc. - ignore */
      }
    };
    void request();
    // The lock is dropped when you leave the app; take it again on return.
    const onVis = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, [enabled]);
}
