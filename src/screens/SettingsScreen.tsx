// Settings: rotation, templates, timer, reminders, deload and backups.
import { useRef, useState } from 'react';
import type { Settings } from '../db/types';
import { isTutorial, startTutorial, updateSettings } from '../db/db';
import { byId, useTemplates } from '../hooks';
import { todayStatus } from '../logic/rotation';
import { acceptDeload, deloadStatus } from '../logic/deload';
import { todayStr } from '../logic/dates';
import { notificationsSupported, showNotification } from '../logic/reminders';
import { importAll } from '../db/actions';
import { exportBackupFile } from '../logic/shareBackup';
import { formatNiceDate } from '../logic/dates';
import { TemplateEditor } from './TemplateEditor';
import { SplitEditor } from './SplitEditor';

function Toggle({ label, on, onChange, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="row spread ex-line">
      <div className="grow">
        {label}
        {hint && <div className="muted small">{hint}</div>}
      </div>
      <button className={on ? 'primary small' : 'small'} style={{ minWidth: 72 }} onClick={() => onChange(!on)} aria-pressed={on}>
        {on ? 'On' : 'Off'}
      </button>
    </div>
  );
}

export function SettingsScreen({ settings }: { settings: Settings }) {
  // Sub-pages: the split editor and the per-session exercise editor.
  const [page, setPage] = useState<'main' | 'split' | { templateId?: string; from: 'main' | 'split' }>('main');
  const templates = byId(useTemplates());
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'));
  const today = todayStr();

  if (page === 'split') {
    return <SplitEditor settings={settings} onBack={() => setPage('main')} onEditExercises={(id) => setPage({ templateId: id, from: 'split' })} />;
  }
  if (page !== 'main') return <TemplateEditor initialId={page.templateId} defaultBar={settings.barWeight ?? 20} onBack={() => setPage(page.from)} />;

  const status = todayStatus(settings.rotationState, settings.rotation, today);
  const deload = deloadStatus(settings, today);
  const slotName = (s: string) => (s === 'rest' ? 'Rest' : templates.get(s)?.name ?? s);

  const doExport = async () => {
    const r = await exportBackupFile();
    if (r !== 'cancelled') setMsg(r === 'shared' ? 'Backup shared ✅' : 'Backup downloaded ✅');
  };

  const doImport = async (file: File) => {
    if (!confirm('This REPLACES all data on this phone with the backup. Continue?')) return;
    try {
      await importAll(await file.text());
      setMsg('Backup restored ✅');
    } catch (e) {
      setMsg('❌ ' + (e as Error).message);
    }
  };

  const askPermission = async () => {
    if (!notificationsSupported()) return;
    setPerm(await Notification.requestPermission());
  };

  return (
    <div>
      <h1>Settings</h1>
      {msg && <div className="banner info" onClick={() => setMsg('')}>{msg}</div>}

      <h2>Rotation</h2>
      <div className="card">
        <label className="field">
          <span>Next session (fix it here if the app is out of step)</span>
          <select
            value={status.index}
            onChange={(e) => updateSettings({ rotationState: { index: Number(e.target.value), since: today } })}
          >
            {settings.rotation.map((s, i) => (
              <option key={i} value={i}>Day {i + 1}: {slotName(s)}</option>
            ))}
          </select>
        </label>
        <button className="big split-btn" onClick={() => setPage('split')}>Edit training split ›</button>
        <div style={{ height: 8 }} />
        <button className="big" onClick={() => setPage({ from: 'main' })}>Edit session exercises ›</button>
      </div>

      <h2>Rest timer</h2>
      <div className="card">
        <Toggle label="Sound" on={settings.timerSound} onChange={(v) => updateSettings({ timerSound: v })} />
        <Toggle label="Vibrate" hint="Android only - iPhones don't allow it" on={settings.timerVibrate} onChange={(v) => updateSettings({ timerVibrate: v })} />
        <Toggle label="Keep screen on during workout" hint="So the timer stays visible" on={settings.keepAwake} onChange={(v) => updateSettings({ keepAwake: v })} />
        <p className="muted small">Rest time per exercise is set in Edit session exercises (default 150 s for the first exercise, 90 s for the rest).</p>
      </div>

      <h2>Plate calculator</h2>
      <div className="card">
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Default bar weight (for barbell exercises without their own)</span>
          <select value={settings.barWeight ?? 20} onChange={(e) => updateSettings({ barWeight: Number(e.target.value) })}>
            {[20, 15, 10, 7.5, 5].map((n) => <option key={n} value={n}>{n} kg{n === 20 ? ' (standard Olympic bar)' : n === 15 ? ' (women’s bar)' : ''}</option>)}
          </select>
        </label>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Change the bar for one exercise (e.g. EZ bar 10 kg) by tapping “Bar” when you edit a set, or in Edit session exercises.
          Machines in pounds: tap “lb” when you edit a set - it’s remembered for that exercise and saved in kg.
        </p>
      </div>

      <h2>Reminders</h2>
      <div className="card">
        <Toggle label="Remind me on training days" on={settings.reminderEnabled} onChange={(v) => updateSettings({ reminderEnabled: v })} />
        <label className="field" style={{ marginTop: 10 }}>
          <span>If I haven't logged a workout by</span>
          <input type="time" value={settings.reminderTime} onChange={(e) => e.target.value && updateSettings({ reminderTime: e.target.value })} />
        </label>
        <div className="row spread">
          <span className="small muted">Phone notifications: <b>{perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked' : perm === 'unsupported' ? 'not available here' : 'not allowed yet'}</b></span>
          {perm === 'default' && <button className="small primary" onClick={askPermission}>Allow</button>}
          {perm === 'granted' && <button className="small" onClick={() => showNotification('Test 💪', 'Notifications work!')}>Test</button>}
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="small">How reminders work on Android vs iPhone</summary>
          <div className="small muted stack" style={{ marginTop: 8 }}>
            <p><b>Everywhere:</b> a yellow banner on the Today screen shows when you open the app after your reminder time.</p>
            <p><b>Android (Chrome):</b> tap “Allow”. You get a phone notification if the app is open or was used recently in the background.</p>
            <p><b>iPhone (iOS 16.4+):</b> notifications ONLY work after you add the app to your Home Screen and open it from there. Then tap “Allow”.</p>
            <p><b>Limitation:</b> this app has no server, so it can't wake itself up at an exact time once the phone has closed it. For a guaranteed nudge, also set a phone alarm.</p>
          </div>
        </details>
      </div>

      <h2>Deload</h2>
      <div className="card">
        <label className="field">
          <span>Suggest a deload week every</span>
          <select value={settings.deloadEveryWeeks} onChange={(e) => updateSettings({ deloadEveryWeeks: Number(e.target.value) })}>
            {[6, 7, 8].map((n) => <option key={n} value={n}>{n} weeks</option>)}
          </select>
        </label>
        <p className="small muted">
          {deload.kind === 'active' && `Deload running: ${deload.daysLeft} day(s) left.`}
          {deload.kind === 'due' && 'A deload is due - see the Today screen.'}
          {deload.kind === 'none' && (settings.deloadCycleStart ? `Week ${deload.weeksIn + 1} of ${settings.deloadEveryWeeks}.` : 'Counting starts with your first workout.')}
        </p>
        {deload.kind === 'active' ? (
          <button onClick={() => updateSettings({ deloadUntil: null, deloadCycleStart: today })}>End deload now</button>
        ) : (
          <button onClick={() => confirm('Start a 7-day deload now?') && updateSettings(acceptDeload(today))}>Start a deload now</button>
        )}
      </div>

      <h2>Backup</h2>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          Your data lives only on this phone. Export a backup regularly and keep it somewhere safe (Google Drive, iCloud, email).
        </p>
        <p className="small" style={{ marginTop: 0 }}>
          Last backup: <b>{settings.lastBackup ? formatNiceDate(settings.lastBackup) : 'never'}</b>
        </p>
        <div className="btn-row">
          <button className="primary" onClick={doExport}>⬇ Export</button>
          <button onClick={() => fileRef.current?.click()}>⬆ Import</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
      </div>
      <h2>Help</h2>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          A quick tour of the app using sample data. Your real data is not touched, and the sample data is deleted when the tour ends.
        </p>
        <button className="big" disabled={isTutorial} onClick={startTutorial}>🎓 Show the tutorial</button>
      </div>
      <p className="muted small center">Gym Companion · works offline · v1.1</p>
    </div>
  );
}
