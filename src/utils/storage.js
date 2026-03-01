const KEYS = {
  APPS:    'arise_apps',
  USAGE:   'arise_usage',
  UNLOCKS: 'arise_unlocks',
  SETTINGS:'arise_settings',
  PROGRESS:'arise_progress',
  DIET:    'arise_diet',
  WEIGHT:  'arise_weight',
  DIET_GOALS: 'arise_diet_goals',
};

export const DEFAULT_APPS = [
  { id: 'instagram', name: 'Instagram', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/600px-Instagram_logo_2022.svg.png', limitMin: 30, enabled: true },
  { id: 'tiktok', name: 'TikTok', icon: 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png', limitMin: 30, enabled: true },
  { id: 'youtube', name: 'YouTube', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/600px-YouTube_full-color_icon_%282017%29.svg.png', limitMin: 60, enabled: true },
  { id: 'twitter', name: 'X', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/X_logo_2023_%28white%29.png/600px-X_logo_2023_%28white%29.png', limitMin: 20, enabled: false },
  { id: 'reddit', name: 'Reddit', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png', limitMin: 20, enabled: false },
  { id: 'snapchat', name: 'Snapchat', icon: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/480px-Snapchat_logo.svg.png', limitMin: 20, enabled: false },
];

export const DEFAULT_SETTINGS = {
  unlockMinutes: 15,
  reps: { PUSH_UP: 2, SQUAT: 2, SIT_UP: 2 },
  seconds: { PLANK: 2 },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- apps ----------
const ICON_MAP = Object.fromEntries(DEFAULT_APPS.map(a => [a.id, a.icon]));

export function getApps() {
  try {
    const raw = localStorage.getItem(KEYS.APPS);
    if (!raw) return DEFAULT_APPS;
    const apps = JSON.parse(raw);
    return apps.map(a => ({ ...a, icon: ICON_MAP[a.id] ?? a.icon }));
  } catch {
    return DEFAULT_APPS;
  }
}

export function saveApps(apps) {
  localStorage.setItem(KEYS.APPS, JSON.stringify(apps));
}

// ---------- usage ----------
export function getUsage() {
  try {
    const raw = localStorage.getItem(KEYS.USAGE);
    const all = raw ? JSON.parse(raw) : {};
    return all[todayKey()] ?? {};
  } catch {
    return {};
  }
}

export function addUsage(appId, minutes) {
  try {
    const raw = localStorage.getItem(KEYS.USAGE);
    const all = raw ? JSON.parse(raw) : {};
    const today = todayKey();
    if (!all[today]) all[today] = {};
    all[today][appId] = (all[today][appId] ?? 0) + minutes;
    localStorage.setItem(KEYS.USAGE, JSON.stringify(all));
  } catch {}
}

export function setUsage(appId, minutes) {
  try {
    const raw = localStorage.getItem(KEYS.USAGE);
    const all = raw ? JSON.parse(raw) : {};
    const today = todayKey();
    if (!all[today]) all[today] = {};
    all[today][appId] = minutes;
    localStorage.setItem(KEYS.USAGE, JSON.stringify(all));
  } catch {}
}

// ---------- unlocks ----------
export function getUnlocks() {
  try {
    const raw = localStorage.getItem(KEYS.UNLOCKS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Grant an unlock for appId. Returns expiry timestamp (ms). */
export function grantUnlock(appId, durationMinutes) {
  const unlocks = getUnlocks();
  const expiry = Date.now() + durationMinutes * 60 * 1000;
  unlocks[appId] = { expiry, grantedAt: Date.now(), durationMinutes };
  localStorage.setItem(KEYS.UNLOCKS, JSON.stringify(unlocks));
  return expiry;
}

/** Returns milliseconds remaining for an unlock, or 0 if expired/none. */
export function getUnlockRemaining(appId) {
  const unlocks = getUnlocks();
  const entry = unlocks[appId];
  if (!entry) return 0;
  const remaining = entry.expiry - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function revokeUnlock(appId) {
  const unlocks = getUnlocks();
  delete unlocks[appId];
  localStorage.setItem(KEYS.UNLOCKS, JSON.stringify(unlocks));
}

// ---------- settings ----------
export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s));
}

// ---------- progress / activity log ----------
export function getProgress() {
  try {
    const raw = localStorage.getItem(KEYS.PROGRESS);
    if (!raw) return seedDemoProgress();
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Log a completed challenge.
 * @param {{ reps?: number, seconds?: number, savedMin?: number }} opts
 */
export function logChallenge({ reps = 0, seconds = 0, savedMin = 0 } = {}) {
  try {
    const all = getRawProgress();
    const today = todayKey();
    if (!all[today]) all[today] = { reps: 0, seconds: 0, challenges: 0, savedMin: 0 };
    all[today].reps      += reps;
    all[today].seconds   += seconds;
    all[today].challenges += 1;
    all[today].savedMin  += savedMin;
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(all));
  } catch {}
}

function getRawProgress() {
  try {
    const raw = localStorage.getItem(KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : seedDemoProgress();
  } catch {
    return {};
  }
}

/** Build a realistic 6-month history so the heatmap looks populated on first launch. */
function seedDemoProgress() {
  const data = {};
  const today = new Date();

  for (let i = 180; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    // Recent 9 days = current streak (always active)
    if (i <= 9) {
      data[key] = {
        reps: Math.floor(Math.random() * 25) + 10,
        seconds: Math.random() > 0.4 ? 60 : 0,
        challenges: Math.floor(Math.random() * 3) + 1,
        savedMin: Math.floor(Math.random() * 20) + 10,
      };
    } else {
      // ~70% weekdays, ~45% weekends
      if (Math.random() > (isWeekend ? 0.45 : 0.30)) continue;
      data[key] = {
        reps: Math.floor(Math.random() * 40),
        seconds: Math.random() > 0.55 ? 60 : 0,
        challenges: Math.floor(Math.random() * 3),
        savedMin: Math.floor(Math.random() * 25),
      };
    }
  }

  localStorage.setItem(KEYS.PROGRESS, JSON.stringify(data));
  return data;
}

/** Returns the current streak length (consecutive active days ending today). */
export function getStreak(progress) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = progress[key];
    if (day && (day.challenges > 0 || day.reps > 0)) {
      streak++;
    } else if (i === 0) {
      // Today hasn't been logged yet — don't break streak
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/** Returns the longest ever streak. */
export function getLongestStreak(progress) {
  const days = Object.keys(progress).sort();
  let best = 0, cur = 0;
  let prev = null;
  for (const key of days) {
    const day = progress[key];
    if (!day || (day.challenges === 0 && day.reps === 0)) { cur = 0; prev = null; continue; }
    if (prev) {
      const p = new Date(prev), c = new Date(key);
      const diff = (c - p) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    if (cur > best) best = cur;
    prev = key;
  }
  return best;
}

// ---------- diet log ----------
export const DEFAULT_DIET_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };
const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function getDietGoals() {
  try {
    const raw = localStorage.getItem(KEYS.DIET_GOALS);
    return raw ? { ...DEFAULT_DIET_GOALS, ...JSON.parse(raw) } : DEFAULT_DIET_GOALS;
  } catch { return DEFAULT_DIET_GOALS; }
}
export function saveDietGoals(g) { localStorage.setItem(KEYS.DIET_GOALS, JSON.stringify(g)); }

export function getDietLog(date = todayKey()) {
  try {
    const raw = localStorage.getItem(KEYS.DIET);
    const all = raw ? JSON.parse(raw) : {};
    return all[date] ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
  } catch { return { breakfast: [], lunch: [], dinner: [], snacks: [] }; }
}

export function addFoodToMeal(meal, food, date = todayKey()) {
  try {
    const raw = localStorage.getItem(KEYS.DIET);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[date]) all[date] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    all[date][meal] = [...(all[date][meal] ?? []), { ...food, loggedAt: Date.now() }];
    localStorage.setItem(KEYS.DIET, JSON.stringify(all));
  } catch {}
}

export function removeFoodFromMeal(meal, index, date = todayKey()) {
  try {
    const raw = localStorage.getItem(KEYS.DIET);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[date]?.[meal]) return;
    all[date][meal] = all[date][meal].filter((_, i) => i !== index);
    localStorage.setItem(KEYS.DIET, JSON.stringify(all));
  } catch {}
}

// ---------- weight log ----------
export function logWeight(kg, date = todayKey()) {
  try {
    const raw = localStorage.getItem(KEYS.WEIGHT);
    const all = raw ? JSON.parse(raw) : {};
    all[date] = kg;
    localStorage.setItem(KEYS.WEIGHT, JSON.stringify(all));
  } catch {}
}

export function getWeightHistory() {
  try {
    const raw = localStorage.getItem(KEYS.WEIGHT);
    if (raw) return JSON.parse(raw);
    return seedWeightHistory();
  } catch { return {}; }
}

function seedWeightHistory() {
  const data = {};
  // 28 days of realistic weight data with a slight downward trend
  const startWeight = 80.2;
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // Trend down ~0.1kg/week with daily noise ±0.4kg
    const trend = (27 - i) * 0.014;
    const noise = (Math.sin(i * 7.3) * 0.3 + Math.cos(i * 2.1) * 0.2);
    data[key] = Math.round((startWeight - trend + noise) * 10) / 10;
  }
  localStorage.setItem(KEYS.WEIGHT, JSON.stringify(data));
  return data;
}

// ---------- demo helper ----------
/** Simulate all enabled apps being over their limit */
export function simulateOverLimit() {
  const apps = getApps();
  apps.filter((a) => a.enabled).forEach((a) => {
    setUsage(a.id, a.limitMin + 10);
    revokeUnlock(a.id);
  });
}
