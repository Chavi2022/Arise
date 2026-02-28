import { useMemo } from 'react';
import { getProgress, getStreak, getLongestStreak } from '../utils/storage';
import { getDietLog } from '../utils/storage';
import { Flame, Trophy, Clock, Dumbbell, CheckCircle, TrendingUp, Salad } from 'lucide-react';

// ─── Heatmap helpers ──────────────────────────────────────────────
const WEEKS = 26; // how many weeks to show
const DAYS  = 7;

/** Combined score from exercise + diet data */
function activityLevel(day, dietDay) {
  let score = 0;
  if (day) score += (day.reps ?? 0) + (day.seconds ?? 0) / 2 + (day.challenges ?? 0) * 5;
  if (dietDay) {
    const allFoods = Object.values(dietDay).flat();
    if (allFoods.length > 0) score += 10; // bonus for logging meals
  }
  if (score === 0)  return 0;
  if (score < 10)  return 1;
  if (score < 25)  return 2;
  if (score < 45)  return 3;
  return 4;
}

function buildGrid(progress, dietAll) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - dayOfWeek));

  const cells = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(end);
      date.setDate(end.getDate() - w * 7 - (6 - d));
      const key = date.toISOString().slice(0, 10);
      cells.push({ key, date, day: progress[key] ?? null, dietDay: dietAll[key] ?? null });
    }
  }
  return cells;
}

function getAllDietLog() {
  try {
    const raw = localStorage.getItem('arise_diet');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function buildMonthLabels() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - dayOfWeek));

  const labels = [];
  let lastMonth = -1;
  for (let w = WEEKS - 1; w >= 0; w--) {
    const date = new Date(end);
    date.setDate(end.getDate() - w * 7);
    const m = date.getMonth();
    if (m !== lastMonth) {
      labels.push({ week: WEEKS - 1 - w, label: date.toLocaleString('default', { month: 'short' }) });
      lastMonth = m;
    }
  }
  return labels;
}

// ─── Week summary ─────────────────────────────────────────────────
function weekSummary(progress) {
  const today = new Date();
  let reps = 0, seconds = 0, challenges = 0, savedMin = 0, activeDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = progress[key];
    if (!day) continue;
    reps      += day.reps ?? 0;
    seconds   += day.seconds ?? 0;
    challenges+= day.challenges ?? 0;
    savedMin  += day.savedMin ?? 0;
    if ((day.challenges ?? 0) > 0 || (day.reps ?? 0) > 0) activeDays++;
  }
  return { reps, seconds, challenges, savedMin, activeDays };
}

function allTimeSummary(progress) {
  let reps = 0, savedMin = 0, challenges = 0;
  Object.values(progress).forEach((d) => {
    reps      += d.reps ?? 0;
    savedMin  += d.savedMin ?? 0;
    challenges+= d.challenges ?? 0;
  });
  return { reps, savedMin, challenges };
}

function fmtHours(min) {
  if (min < 60) return `${min}m`;
  return `${(min / 60).toFixed(1)}h`;
}

// ─── Components ───────────────────────────────────────────────────
const LEVEL_COLORS = ['#1a1a35', '#3b1e6b', '#5b21b6', '#7c3aed', '#a855f7'];
const DAY_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Heatmap({ progress, dietAll }) {
  const cells   = useMemo(() => buildGrid(progress, dietAll), [progress, dietAll]);
  const months  = useMemo(() => buildMonthLabels(), []);
  const CELL    = 13;
  const GAP     = 3;
  const STEP    = CELL + GAP;
  const labelW  = 28;

  return (
    <div className="heatmap-wrap">
      {/* Month labels */}
      <div className="heatmap-months" style={{ marginLeft: labelW }}>
        {months.map((m) => (
          <span
            key={`${m.label}-${m.week}`}
            className="heatmap-month-label"
            style={{ left: m.week * STEP }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid + day labels */}
      <div className="heatmap-body">
        {/* Day labels */}
        <div className="heatmap-day-labels" style={{ width: labelW }}>
          {[1, 3, 5].map((d) => (
            <span key={d} className="heatmap-day-label" style={{ top: d * STEP }}>
              {DAY_LABELS[d]}
            </span>
          ))}
        </div>

        {/* Cells — 7 rows × WEEKS cols */}
        <div
          className="heatmap-grid"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${DAYS}, ${CELL}px)`,
            gridTemplateColumns: `repeat(${WEEKS}, ${CELL}px)`,
            gap: GAP,
            gridAutoFlow: 'column',
          }}
        >
          {cells.map(({ key, date, day, dietDay }) => {
            const level = activityLevel(day, dietDay);
            const dietCount = dietDay ? Object.values(dietDay).flat().length : 0;
            const label = (day || dietDay)
              ? `${key}: ${day?.challenges ?? 0} challenges, ${day?.reps ?? 0} reps${dietCount ? `, ${dietCount} foods logged` : ''}`
              : key;
            return (
              <div
                key={key}
                className="heatmap-cell"
                title={label}
                style={{ background: LEVEL_COLORS[level] }}
                data-level={level}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="heatmap-cell" style={{ background: c, width: 13, height: 13, borderRadius: 3 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function Progress() {
  const progress = useMemo(() => getProgress(), []);
  const streak   = useMemo(() => getStreak(progress), [progress]);
  const longest  = useMemo(() => getLongestStreak(progress), [progress]);
  const week     = useMemo(() => weekSummary(progress), [progress]);
  const allTime  = useMemo(() => allTimeSummary(progress), [progress]);
  const dietAll  = useMemo(() => getAllDietLog(), []);
  const dietDaysLogged = useMemo(() => Object.keys(dietAll).length, [dietAll]);

  return (
    <div className="page progress-page">
      <h1 className="page-title">Progress</h1>
      <p className="page-subtitle">Your streak & activity history</p>

      {/* ── Streak cards ── */}
      <div className="streak-row">
        <div className="streak-card main">
          <Flame size={28} className="streak-flame" />
          <div>
            <div className="streak-num">{streak}</div>
            <div className="streak-label">day streak</div>
          </div>
        </div>
        <div className="streak-card">
          <Trophy size={22} color="#f59e0b" />
          <div>
            <div className="streak-num gold">{longest}</div>
            <div className="streak-label">best streak</div>
          </div>
        </div>
      </div>

      {/* ── Heatmap ── */}
      <section className="section">
        <h2 className="section-title">Activity — last 6 months</h2>
        <p className="section-desc" style={{ marginBottom: 8 }}>
          Color intensity reflects exercise challenges + nutrition logging.
        </p>
        <div className="heatmap-container">
          <Heatmap progress={progress} dietAll={dietAll} />
        </div>
      </section>

      {/* ── This week ── */}
      <section className="section">
        <h2 className="section-title">This Week</h2>
        <div className="progress-grid">
          <div className="progress-card">
            <Clock size={20} color="var(--green)" />
            <div className="progress-card-val">{fmtHours(week.savedMin)}</div>
            <div className="progress-card-label">Screen time saved</div>
          </div>
          <div className="progress-card">
            <Dumbbell size={20} color="var(--purple-light)" />
            <div className="progress-card-val">{week.reps}</div>
            <div className="progress-card-label">Reps completed</div>
          </div>
          <div className="progress-card">
            <CheckCircle size={20} color="var(--amber)" />
            <div className="progress-card-val">{week.challenges}</div>
            <div className="progress-card-label">Challenges done</div>
          </div>
          <div className="progress-card">
            <TrendingUp size={20} color="#ec4899" />
            <div className="progress-card-val">{week.activeDays}/7</div>
            <div className="progress-card-label">Active days</div>
          </div>
        </div>

        {/* Mini bar chart for the week */}
        <WeekBars progress={progress} />
      </section>

      {/* ── All time ── */}
      <section className="section">
        <h2 className="section-title">All Time</h2>
        <div className="alltime-list settings-box">
          <div className="alltime-row">
            <span><Clock size={16} /> Screen time saved</span>
            <strong>{fmtHours(allTime.savedMin)}</strong>
          </div>
          <div className="alltime-row">
            <span><Dumbbell size={16} /> Total reps</span>
            <strong>{allTime.reps.toLocaleString()}</strong>
          </div>
          <div className="alltime-row">
            <span><CheckCircle size={16} /> Challenges completed</span>
            <strong>{allTime.challenges}</strong>
          </div>
          <div className="alltime-row">
            <span><Salad size={16} /> Diet days logged</span>
            <strong>{dietDaysLogged}</strong>
          </div>
          <div className="alltime-row">
            <span><Flame size={16} /> Longest streak</span>
            <strong>{longest} days</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Weekly bar chart ─────────────────────────────────────────────
function WeekBars({ progress }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const day = progress[key];
    return {
      label: d.toLocaleString('default', { weekday: 'short' }),
      isToday: i === 6,
      reps: day?.reps ?? 0,
      challenges: day?.challenges ?? 0,
      savedMin: day?.savedMin ?? 0,
    };
  });

  const maxReps = Math.max(...days.map((d) => d.reps), 1);

  return (
    <div className="week-bars">
      {days.map((d, i) => (
        <div key={i} className="week-bar-col">
          <div className="week-bar-track">
            <div
              className="week-bar-fill"
              style={{
                height: `${(d.reps / maxReps) * 100}%`,
                background: d.isToday ? 'var(--purple-light)' : d.reps > 0 ? 'var(--purple)' : 'var(--border)',
              }}
            />
          </div>
          <span className={`week-bar-label ${d.isToday ? 'today' : ''}`}>{d.label}</span>
          {d.challenges > 0 && <span className="week-bar-dot" />}
        </div>
      ))}
    </div>
  );
}
