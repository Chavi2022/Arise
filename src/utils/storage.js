const KEYS = {
  APPS: 'arise_apps',
  USAGE: 'arise_usage',
  UNLOCKS: 'arise_unlocks',
  SETTINGS: 'arise_settings',
};

export const DEFAULT_APPS = [
  { id: 'instagram', name: 'Instagram', emoji: '📸', limitMin: 30, enabled: true },
  { id: 'tiktok', name: 'TikTok', emoji: '🎵', limitMin: 30, enabled: true },
  { id: 'youtube', name: 'YouTube', emoji: '▶️', limitMin: 60, enabled: true },
  { id: 'twitter', name: 'Twitter / X', emoji: '🐦', limitMin: 20, enabled: false },
  { id: 'reddit', name: 'Reddit', emoji: '🤖', limitMin: 20, enabled: false },
  { id: 'snapchat', name: 'Snapchat', emoji: '👻', limitMin: 20, enabled: false },
];

export const DEFAULT_SETTINGS = {
  unlockMinutes: 15,
  reps: { PUSH_UP: 10, SQUAT: 20, SIT_UP: 15 },
  seconds: { PLANK: 60 },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- apps ----------
export function getApps() {
  try {
    const raw = localStorage.getItem(KEYS.APPS);
    return raw ? JSON.parse(raw) : DEFAULT_APPS;
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

// ---------- demo helper ----------
/** Simulate all enabled apps being over their limit */
export function simulateOverLimit() {
  const apps = getApps();
  apps.filter((a) => a.enabled).forEach((a) => setUsage(a.id, a.limitMin + 10));
}
