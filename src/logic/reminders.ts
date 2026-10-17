// Should we nag you to train? Yes if: reminders are on, today is a training
// day, you haven't started or finished a workout today, and it's past the time.

export function shouldRemind(opts: {
  enabled: boolean;
  isTrainingDay: boolean;
  workedOutToday: boolean;
  /** "HH:MM" */
  now: string;
  reminderTime: string;
}): boolean {
  return opts.enabled && opts.isTrainingDay && !opts.workedOutToday && opts.now >= opts.reminderTime;
}

export function nowHHMM(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

/** Show a system notification through the service worker (works on Android & installed iPhone apps). */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title });
    return true;
  } catch {
    return false;
  }
}
