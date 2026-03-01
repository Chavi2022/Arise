const KEYS = {
  FRIENDS:       'arise_friends',
  SHARED_GOALS:  'arise_shared_goals',
  PROFILE:       'arise_profile',
  LAST_WEEK_LB:  'arise_last_week_lb',
};

const AVATAR_COLORS = [
  '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6',
];

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- profile ----------
export function getProfile() {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
    const profile = {
      id: randomId(),
      name: 'You',
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    };
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    return profile;
  } catch {
    return { id: 'me', name: 'You', color: '#7c3aed' };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// ---------- friends ----------
const DEMO_FRIENDS = [
  { id: 'f1', name: 'Alex',    color: '#3b82f6', streak: 14, totalReps: 2340, weekReps: 180, challenges: 42, todayExercises: 3 },
  { id: 'f2', name: 'Jordan',  color: '#ec4899', streak: 7,  totalReps: 1580, weekReps: 220, challenges: 31, todayExercises: 1 },
  { id: 'f3', name: 'Sam',     color: '#f59e0b', streak: 21, totalReps: 3100, weekReps: 150, challenges: 58, todayExercises: 4 },
  { id: 'f4', name: 'Riley',   color: '#10b981', streak: 3,  totalReps: 890,  weekReps: 95,  challenges: 18, todayExercises: 0 },
  { id: 'f5', name: 'Casey',   color: '#06b6d4', streak: 11, totalReps: 1920, weekReps: 200, challenges: 37, todayExercises: 2 },
];

export function getFriends() {
  try {
    const raw = localStorage.getItem(KEYS.FRIENDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((f) => ({ todayExercises: 0, ...f }));
    }
    localStorage.setItem(KEYS.FRIENDS, JSON.stringify(DEMO_FRIENDS));
    return DEMO_FRIENDS;
  } catch {
    return DEMO_FRIENDS;
  }
}

export function saveFriends(friends) {
  localStorage.setItem(KEYS.FRIENDS, JSON.stringify(friends));
}

export function addFriend(name) {
  const friends = getFriends();
  const friend = {
    id: randomId(),
    name,
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    streak: 0,
    totalReps: 0,
    weekReps: 0,
    challenges: 0,
    todayExercises: 0,
  };
  friends.push(friend);
  saveFriends(friends);
  return friend;
}

export function removeFriend(id) {
  const friends = getFriends().filter((f) => f.id !== id);
  saveFriends(friends);

  const goals = getSharedGoals().filter(
    (g) => !g.participants.includes(id)
  );
  saveSharedGoals(goals);
}

// ---------- exercise types for goals ----------
export const GOAL_EXERCISES = [
  { id: 'PUSH_UP', name: 'Push-ups', emoji: '🏋️', unit: 'reps' },
  { id: 'SQUAT',   name: 'Squats',   emoji: '🦵', unit: 'reps' },
  { id: 'SIT_UP',  name: 'Sit-ups',  emoji: '🤸', unit: 'reps' },
  { id: 'PLANK',   name: 'Plank',    emoji: '🧘', unit: 'sec' },
];

// ---------- shared goals ----------
const DEMO_GOALS = [
  {
    id: 'g1',
    title: '500 Push-ups This Week',
    exerciseType: 'PUSH_UP',
    targetReps: 500,
    currentReps: 390,
    participants: ['f1', 'f3'],
    contributions: { 'f1': 160, 'f3': 130, '_me': 100 },
    createdAt: Date.now() - 3 * 86400000,
    deadline: Date.now() + 4 * 86400000,
  },
  {
    id: 'g2',
    title: '300 Squats Challenge',
    exerciseType: 'SQUAT',
    targetReps: 300,
    currentReps: 215,
    participants: ['f2', 'f4', 'f5'],
    contributions: { 'f2': 65, 'f4': 40, 'f5': 50, '_me': 60 },
    createdAt: Date.now() - 5 * 86400000,
    deadline: Date.now() + 2 * 86400000,
  },
];

export function getSharedGoals() {
  try {
    const raw = localStorage.getItem(KEYS.SHARED_GOALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((g) => ({ contributions: {}, exerciseType: null, ...g }));
    }
    localStorage.setItem(KEYS.SHARED_GOALS, JSON.stringify(DEMO_GOALS));
    return DEMO_GOALS;
  } catch {
    return DEMO_GOALS;
  }
}

export function saveSharedGoals(goals) {
  localStorage.setItem(KEYS.SHARED_GOALS, JSON.stringify(goals));
}

export function addSharedGoal({ title, targetReps, participants, deadlineDays, exerciseType }) {
  const goals = getSharedGoals();
  const contribs = {};
  participants.forEach((p) => { contribs[p] = 0; });
  contribs['_me'] = 0;
  const goal = {
    id: randomId(),
    title,
    exerciseType,
    targetReps,
    currentReps: 0,
    participants,
    contributions: contribs,
    createdAt: Date.now(),
    deadline: Date.now() + deadlineDays * 86400000,
  };
  goals.push(goal);
  saveSharedGoals(goals);
  return goal;
}

export function removeSharedGoal(id) {
  const goals = getSharedGoals().filter((g) => g.id !== id);
  saveSharedGoals(goals);
}

/**
 * After completing an exercise, add reps/seconds to all matching active goals.
 * @param {string} exerciseId - e.g. 'PUSH_UP', 'SQUAT', 'SIT_UP', 'PLANK'
 * @param {number} amount - reps completed (or seconds held for plank)
 */
export function contributeToGoals(exerciseId, amount) {
  if (!amount || amount <= 0) return;
  const goals = getSharedGoals();
  let changed = false;
  goals.forEach((g) => {
    if (g.exerciseType !== exerciseId) return;
    if (g.deadline < Date.now()) return;
    if (g.currentReps >= g.targetReps) return;
    g.contributions['_me'] = (g.contributions['_me'] ?? 0) + amount;
    g.currentReps = Object.values(g.contributions).reduce((s, v) => s + v, 0);
    changed = true;
  });
  if (changed) saveSharedGoals(goals);
}

export function getUserStats(progress) {
  let totalReps = 0, weekReps = 0, challenges = 0, todayExercises = 0;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  Object.entries(progress).forEach(([key, day]) => {
    totalReps += day.reps ?? 0;
    challenges += day.challenges ?? 0;
    const d = new Date(key);
    const diff = (today - d) / 86400000;
    if (diff <= 7) weekReps += day.reps ?? 0;
    if (key === todayKey) todayExercises = day.challenges ?? 0;
  });
  return { totalReps, weekReps, challenges, todayExercises };
}

// ---------- last week leaderboard ----------
function weekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return `${d.getFullYear()}-W${String(1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)).padStart(2, '0')}`;
}

const LAST_WEEK_TITLES = [
  'Rep Machine',
  'Iron Will',
  'Grind King',
];

export function getLastWeekPlacements() {
  try {
    const raw = localStorage.getItem(KEYS.LAST_WEEK_LB);
    if (raw) {
      const data = JSON.parse(raw);
      const lastWeek = weekNumber(new Date(Date.now() - 7 * 86400000));
      if (data.week === lastWeek) return data.placements;
    }
    return seedLastWeekPlacements();
  } catch {
    return {};
  }
}

function seedLastWeekPlacements() {
  const friends = getFriends();
  const sorted = [...friends].sort((a, b) => b.weekReps - a.weekReps);
  const placements = {};
  sorted.slice(0, 3).forEach((f, i) => {
    placements[f.id] = { rank: i + 1, title: LAST_WEEK_TITLES[i] };
  });
  const lastWeek = weekNumber(new Date(Date.now() - 7 * 86400000));
  localStorage.setItem(KEYS.LAST_WEEK_LB, JSON.stringify({ week: lastWeek, placements }));
  return placements;
}

export function refreshWeeklyPlacements(allEntries) {
  const currentWeek = weekNumber(new Date());
  try {
    const raw = localStorage.getItem(KEYS.LAST_WEEK_LB);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.week === weekNumber(new Date(Date.now() - 7 * 86400000))) return data.placements;
    }
  } catch {}

  const sorted = [...allEntries].sort((a, b) => b.weekReps - a.weekReps);
  const placements = {};
  sorted.slice(0, 3).forEach((entry, i) => {
    placements[entry.id] = { rank: i + 1, title: LAST_WEEK_TITLES[i] };
  });
  const lastWeek = weekNumber(new Date(Date.now() - 7 * 86400000));
  localStorage.setItem(KEYS.LAST_WEEK_LB, JSON.stringify({ week: lastWeek, placements }));
  return placements;
}
