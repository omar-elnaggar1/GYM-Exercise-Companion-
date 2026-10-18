// Save the backup file: the phone's share sheet when available (Save to
// Files / Drive / email), otherwise a normal download.
import { exportAll, markBackedUp } from '../db/actions';
import { todayStr } from './dates';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

export async function exportBackupFile(): Promise<ExportResult> {
  const json = await exportAll();
  const name = `gym-backup-${todayStr()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gym backup' });
      await markBackedUp();
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  await markBackedUp();
  return 'downloaded';
}
