// All the shapes of data the app stores. Dates are local "YYYY-MM-DD" strings.

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

/** One exercise in the library. History is tracked per exercise id. */
export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  /** Kilograms added when a progression is suggested. */
  increment: number;
  /** Time-based (e.g. plank): "reps" are seconds. */
  timed?: boolean;
  /** Logged per leg/arm (e.g. Bulgarian split squat). */
  perSide?: boolean;
  /** Ids of exercises that train the same muscle, offered in "Swap". */
  alternatives: string[];
}

export interface TemplateItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Rest after each set. Empty = default (150 s first exercise, 90 s others). */
  restSeconds?: number;
}

export type TemplateId = string;

export interface Template {
  id: TemplateId;
  name: string;
  color: string;
  items: TemplateItem[];
  /** Deleted sessions are hidden but kept so old history still shows their name. */
  archived?: boolean;
}

/** A rotation slot: a template id, or 'rest'. */
export type Slot = TemplateId | 'rest';

export interface RotationState {
  /** Index into settings.rotation of the session that is up next. */
  index: number;
  /** First day the current slot is "due" (YYYY-MM-DD). */
  since: string;
}

export interface LoggedSet {
  weight: number;
  /** Reps, or seconds for timed exercises. */
  reps: number;
  done: boolean;
}

export interface WorkoutEntry {
  exerciseId: string;
  repMin: number;
  repMax: number;
  restSeconds: number;
  sets: LoggedSet[];
  note: string;
}

export interface Workout {
  id?: number;
  date: string;
  templateId: TemplateId;
  /** Which rotation slot this workout fulfils (used for streaks). */
  slotIndex: number;
  startedAt: number;
  finishedAt?: number;
  deload: boolean;
  note: string;
  entries: WorkoutEntry[];
}

export interface BodyweightEntry {
  date: string;
  kg: number;
}

export interface Settings {
  id: 'main';
  rotation: Slot[];
  rotationState: RotationState;
  reminderEnabled: boolean;
  /** "HH:MM", 24h. */
  reminderTime: string;
  /** Date of the last notification we fired, to avoid repeats. */
  reminderLastFired?: string;
  deloadEveryWeeks: number;
  /** Start of the current training block (null until first workout). */
  deloadCycleStart: string | null;
  /** If a deload week is running: first day AFTER it ends. */
  deloadUntil: string | null;
  keepAwake: boolean;
  timerSound: boolean;
  timerVibrate: boolean;
  /** Empty barbell weight for the plate calculator (default 20). */
  barWeight?: number;
  /** Date of the last Export (YYYY-MM-DD). */
  lastBackup?: string;
  /** Backup reminder hidden until this date. */
  backupSnoozedUntil?: string;
}
