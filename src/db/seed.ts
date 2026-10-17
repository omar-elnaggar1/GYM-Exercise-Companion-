// The preloaded program: exercise library, alternatives and the 5 templates.
import type { Equipment, Exercise, Settings, Slot, Template } from './types';

/** Default weight jump per equipment type (editable per exercise later). */
export const DEFAULT_INCREMENT: Record<Equipment, number> = {
  barbell: 2.5,
  machine: 2.5,
  cable: 2.5,
  dumbbell: 2,
  bodyweight: 2.5,
};

type Def = [name: string, equipment: Equipment, extra?: { timed?: boolean; perSide?: boolean }];

/** Every exercise the app knows about, keyed by id. */
const LIB: Record<string, Def> = {
  'barbell-bench': ['Barbell bench press', 'barbell'],
  'db-bench': ['Dumbbell bench press', 'dumbbell'],
  'machine-chest-press': ['Machine chest press', 'machine'],
  'smith-bench': ['Smith machine bench press', 'machine'],
  'push-up': ['Push-up', 'bodyweight'],
  'barbell-row': ['Barbell row', 'barbell'],
  'chest-supported-row': ['Chest-supported row', 'machine'],
  'seated-cable-row': ['Seated cable row', 'cable'],
  'single-arm-db-row': ['Single-arm dumbbell row', 'dumbbell'],
  't-bar-row': ['T-bar row', 'barbell'],
  'machine-row': ['Machine row', 'machine'],
  'single-arm-cable-row': ['Single-arm cable row', 'cable'],
  'meadows-row': ['Meadows row', 'barbell'],
  'seated-db-press': ['Seated dumbbell shoulder press', 'dumbbell'],
  'barbell-ohp': ['Standing barbell overhead press', 'barbell'],
  'machine-shoulder-press': ['Machine shoulder press', 'machine'],
  'arnold-press': ['Arnold press', 'dumbbell'],
  'landmine-press': ['Landmine press', 'barbell'],
  'lat-pulldown': ['Lat pulldown', 'cable'],
  'pull-up': ['Pull-up', 'bodyweight'],
  'chin-up': ['Chin-up', 'bodyweight'],
  'assisted-pull-up': ['Assisted pull-up machine', 'machine'],
  'single-arm-pulldown': ['Single-arm cable pulldown', 'cable'],
  'straight-arm-pulldown': ['Straight-arm pulldown', 'cable'],
  'db-curl': ['Dumbbell curl', 'dumbbell'],
  'barbell-curl': ['Barbell curl', 'barbell'],
  'ez-curl': ['EZ-bar curl', 'barbell'],
  'cable-curl': ['Cable curl', 'cable'],
  'preacher-curl-machine': ['Preacher curl machine', 'machine'],
  'incline-db-curl': ['Incline dumbbell curl', 'dumbbell'],
  'bayesian-curl': ['Bayesian cable curl', 'cable'],
  'hammer-curl': ['Hammer curl', 'dumbbell'],
  'rope-hammer-curl': ['Cable rope hammer curl', 'cable'],
  'cross-body-hammer': ['Cross-body hammer curl', 'dumbbell'],
  'reverse-ez-curl': ['Reverse-grip EZ-bar curl', 'barbell'],
  'triceps-pushdown': ['Cable triceps pushdown', 'cable'],
  'overhead-cable-ext': ['Overhead cable triceps extension', 'cable'],
  'overhead-db-ext': ['Overhead dumbbell triceps extension', 'dumbbell'],
  'lying-db-ext': ['Lying dumbbell triceps extension', 'dumbbell'],
  'ez-skull-crusher': ['EZ-bar skull crusher', 'barbell'],
  'dips': ['Dips', 'bodyweight'],
  'close-grip-bench': ['Close-grip bench press', 'barbell'],
  'machine-triceps-ext': ['Machine triceps extension', 'machine'],
  'back-squat': ['Back squat', 'barbell'],
  'front-squat': ['Front squat', 'barbell'],
  'hack-squat': ['Hack squat', 'machine'],
  'leg-press': ['Leg press', 'machine'],
  'goblet-squat': ['Goblet squat', 'dumbbell'],
  'smith-squat': ['Smith machine squat', 'machine'],
  'rdl': ['Romanian deadlift', 'barbell'],
  'db-rdl': ['Dumbbell Romanian deadlift', 'dumbbell'],
  'good-morning': ['Good morning', 'barbell'],
  'cable-pull-through': ['Cable pull-through', 'cable'],
  'back-extension': ['Back extension', 'bodyweight'],
  'lying-leg-curl': ['Lying leg curl', 'machine'],
  'seated-leg-curl': ['Seated leg curl', 'machine'],
  'nordic-curl': ['Nordic curl', 'bodyweight'],
  'ball-leg-curl': ['Stability ball leg curl', 'bodyweight'],
  'single-leg-curl': ['Single-leg leg curl', 'machine'],
  'standing-calf': ['Standing calf raise', 'machine'],
  'seated-calf': ['Seated calf raise', 'machine'],
  'leg-press-calf': ['Leg press calf raise', 'machine'],
  'single-leg-db-calf': ['Single-leg dumbbell calf raise', 'dumbbell'],
  'smith-calf': ['Smith machine calf raise', 'machine'],
  'hanging-leg-raise': ['Hanging leg raise', 'bodyweight'],
  'captains-chair': ["Captain's chair knee raise", 'bodyweight'],
  'cable-crunch': ['Cable crunch', 'cable'],
  'reverse-crunch': ['Reverse crunch', 'bodyweight'],
  'ab-wheel': ['Ab wheel rollout', 'bodyweight'],
  'incline-db-press': ['Incline dumbbell press', 'dumbbell'],
  'incline-barbell-bench': ['Incline barbell bench press', 'barbell'],
  'incline-machine-press': ['Incline machine press', 'machine'],
  'smith-incline': ['Smith machine incline press', 'machine'],
  'low-high-cable-fly': ['Low-to-high cable fly', 'cable'],
  'db-lateral-raise': ['Dumbbell lateral raise', 'dumbbell'],
  'cable-lateral-raise': ['Cable lateral raise', 'cable'],
  'machine-lateral-raise': ['Machine lateral raise', 'machine'],
  'lean-away-lateral': ['Lean-away dumbbell lateral raise', 'dumbbell'],
  'seated-lateral-raise': ['Seated dumbbell lateral raise', 'dumbbell'],
  'cable-fly': ['Cable fly', 'cable'],
  'pec-deck': ['Pec deck', 'machine'],
  'db-fly': ['Dumbbell fly', 'dumbbell'],
  'face-pull': ['Face pull', 'cable'],
  'reverse-pec-deck': ['Reverse pec deck', 'machine'],
  'db-reverse-fly': ['Bent-over dumbbell reverse fly', 'dumbbell'],
  'band-pull-apart': ['Band pull-apart', 'bodyweight'],
  'cable-rear-delt-fly': ['Cable rear delt fly', 'cable'],
  'bulgarian-split-squat': ['Bulgarian split squat', 'dumbbell', { perSide: true }],
  'walking-lunge': ['Walking lunge', 'dumbbell', { perSide: true }],
  'reverse-lunge': ['Reverse lunge', 'dumbbell', { perSide: true }],
  'step-up': ['Step-up', 'dumbbell', { perSide: true }],
  'smith-split-squat': ['Smith machine split squat', 'machine', { perSide: true }],
  'hip-thrust': ['Hip thrust', 'barbell'],
  'machine-hip-thrust': ['Machine hip thrust', 'machine'],
  'glute-bridge': ['Barbell glute bridge', 'barbell'],
  'db-hip-thrust': ['Dumbbell hip thrust', 'dumbbell'],
  'leg-extension': ['Leg extension', 'machine'],
  'single-leg-extension': ['Single-leg leg extension', 'machine'],
  'sissy-squat': ['Sissy squat', 'bodyweight'],
  'reverse-nordic': ['Reverse Nordic', 'bodyweight'],
  'plank': ['Plank', 'bodyweight', { timed: true }],
  'side-plank': ['Side plank', 'bodyweight', { timed: true, perSide: true }],
  'hollow-hold': ['Hollow body hold', 'bodyweight', { timed: true }],
  'dead-bug': ['Dead bug', 'bodyweight'],
};

/**
 * Swap groups: [main exercise, ...alternatives]. Every group's exercises
 * train the same muscle. The main exercise gets exactly this list; an
 * alternative gets everything from every group it appears in.
 */
const GROUPS: string[][] = [
  ['barbell-bench', 'db-bench', 'machine-chest-press', 'smith-bench', 'push-up'],
  ['barbell-row', 'chest-supported-row', 'seated-cable-row', 'single-arm-db-row', 't-bar-row'],
  ['seated-db-press', 'barbell-ohp', 'machine-shoulder-press', 'arnold-press', 'landmine-press'],
  ['lat-pulldown', 'pull-up', 'assisted-pull-up', 'single-arm-pulldown', 'straight-arm-pulldown'],
  ['db-curl', 'barbell-curl', 'ez-curl', 'cable-curl', 'preacher-curl-machine'],
  ['triceps-pushdown', 'overhead-cable-ext', 'lying-db-ext', 'dips', 'machine-triceps-ext'],
  ['back-squat', 'front-squat', 'hack-squat', 'goblet-squat', 'smith-squat'],
  ['rdl', 'db-rdl', 'good-morning', 'cable-pull-through', 'back-extension'],
  ['leg-press', 'hack-squat', 'smith-squat', 'goblet-squat', 'bulgarian-split-squat'],
  ['lying-leg-curl', 'seated-leg-curl', 'nordic-curl', 'ball-leg-curl', 'single-leg-curl'],
  ['standing-calf', 'seated-calf', 'leg-press-calf', 'single-leg-db-calf', 'smith-calf'],
  ['hanging-leg-raise', 'captains-chair', 'cable-crunch', 'reverse-crunch', 'ab-wheel'],
  ['incline-db-press', 'incline-barbell-bench', 'incline-machine-press', 'smith-incline', 'low-high-cable-fly'],
  ['machine-chest-press', 'barbell-bench', 'db-bench', 'smith-bench', 'push-up'],
  ['db-lateral-raise', 'cable-lateral-raise', 'machine-lateral-raise', 'lean-away-lateral', 'seated-lateral-raise'],
  ['cable-fly', 'pec-deck', 'db-fly', 'low-high-cable-fly', 'push-up'],
  ['overhead-cable-ext', 'overhead-db-ext', 'triceps-pushdown', 'ez-skull-crusher', 'dips'],
  ['pull-up', 'lat-pulldown', 'assisted-pull-up', 'chin-up', 'single-arm-pulldown'],
  ['seated-cable-row', 'chest-supported-row', 'machine-row', 'barbell-row', 'single-arm-db-row'],
  ['single-arm-db-row', 'single-arm-cable-row', 'chest-supported-row', 'seated-cable-row', 'meadows-row'],
  ['face-pull', 'reverse-pec-deck', 'db-reverse-fly', 'band-pull-apart', 'cable-rear-delt-fly'],
  ['incline-db-curl', 'bayesian-curl', 'db-curl', 'preacher-curl-machine', 'barbell-curl'],
  ['hammer-curl', 'rope-hammer-curl', 'cross-body-hammer', 'reverse-ez-curl', 'db-curl'],
  ['bulgarian-split-squat', 'walking-lunge', 'reverse-lunge', 'step-up', 'smith-split-squat'],
  ['hip-thrust', 'machine-hip-thrust', 'glute-bridge', 'db-hip-thrust', 'cable-pull-through'],
  ['leg-extension', 'single-leg-extension', 'sissy-squat', 'reverse-nordic', 'goblet-squat'],
  ['seated-leg-curl', 'lying-leg-curl', 'nordic-curl', 'ball-leg-curl', 'single-leg-curl'],
  ['seated-calf', 'standing-calf', 'leg-press-calf', 'single-leg-db-calf', 'smith-calf'],
  ['plank', 'side-plank', 'hollow-hold', 'ab-wheel', 'dead-bug'],
];

const MAX_ALTERNATIVES = 6;

export function buildExercises(): Exercise[] {
  const alts = new Map<string, string[]>();
  const primaries = new Set(GROUPS.map((g) => g[0]));
  for (const group of GROUPS) {
    const [main, ...rest] = group;
    alts.set(main, rest);
  }
  for (const group of GROUPS) {
    for (const id of group) {
      if (primaries.has(id)) continue;
      const list = alts.get(id) ?? [];
      for (const other of group) if (other !== id && !list.includes(other)) list.push(other);
      alts.set(id, list.slice(0, MAX_ALTERNATIVES));
    }
  }
  return Object.entries(LIB).map(([id, [name, equipment, extra]]) => ({
    id,
    name,
    equipment,
    increment: DEFAULT_INCREMENT[equipment],
    ...extra,
    alternatives: alts.get(id) ?? [],
  }));
}

/** Shorthand: [exerciseId, sets, repMin, repMax] */
type Row = [string, number, number, number];
const t = (id: string, name: string, color: string, rows: Row[]): Template => ({
  id,
  name,
  color,
  items: rows.map(([exerciseId, sets, repMin, repMax]) => ({ exerciseId, sets, repMin, repMax })),
});

export function buildTemplates(): Template[] {
  return [
    t('upper', 'Upper', '#60a5fa', [
      ['barbell-bench', 3, 6, 10],
      ['barbell-row', 3, 8, 10],
      ['seated-db-press', 3, 8, 12],
      ['lat-pulldown', 3, 10, 12],
      ['db-curl', 2, 10, 12],
      ['triceps-pushdown', 2, 10, 12],
    ]),
    t('lower', 'Lower', '#f97316', [
      ['back-squat', 3, 6, 10],
      ['rdl', 3, 8, 10],
      ['leg-press', 3, 10, 12],
      ['lying-leg-curl', 3, 10, 12],
      ['standing-calf', 3, 10, 15],
      ['hanging-leg-raise', 3, 10, 15],
    ]),
    t('push', 'Push', '#f43f5e', [
      ['incline-db-press', 3, 8, 10],
      ['machine-chest-press', 3, 10, 12],
      ['db-lateral-raise', 4, 12, 15],
      ['cable-fly', 3, 12, 15],
      ['overhead-cable-ext', 3, 10, 12],
    ]),
    t('pull', 'Pull', '#a78bfa', [
      ['pull-up', 3, 6, 10],
      ['seated-cable-row', 3, 10, 12],
      ['single-arm-db-row', 3, 10, 12],
      ['face-pull', 3, 12, 15],
      ['incline-db-curl', 3, 10, 12],
      ['hammer-curl', 2, 10, 12],
    ]),
    t('legs', 'Legs', '#facc15', [
      ['bulgarian-split-squat', 3, 8, 12],
      ['hip-thrust', 3, 8, 12],
      ['leg-extension', 3, 12, 15],
      ['seated-leg-curl', 3, 12, 15],
      ['seated-calf', 3, 12, 15],
      ['plank', 3, 30, 60],
    ]),
  ];
}

export const DEFAULT_ROTATION: Slot[] = ['upper', 'lower', 'rest', 'push', 'pull', 'legs', 'rest'];

export function buildSettings(today: string): Settings {
  return {
    id: 'main',
    rotation: [...DEFAULT_ROTATION],
    rotationState: { index: 0, since: today },
    reminderEnabled: false,
    reminderTime: '18:00',
    deloadEveryWeeks: 6,
    deloadCycleStart: null,
    deloadUntil: null,
    keepAwake: true,
    timerSound: true,
    timerVibrate: true,
  };
}
