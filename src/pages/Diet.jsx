import { useState, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, X, Share2, ChevronDown, ChevronUp, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  getDietLog, addFoodToMeal, removeFoodFromMeal,
  getDietGoals, logWeight, getWeightHistory, saveDietGoals,
} from '../utils/storage';
import { searchFood, QUICK_FOODS, macrosFor, sumMacros } from '../utils/nutritionApi';

// ─── Constants ────────────────────────────────────────────────────
const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙'  },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎'  },
];

// ─── Macro ring (SVG) ─────────────────────────────────────────────
function MacroRing({ value, goal, color, size = 56, stroke = 6 }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / (goal || 1), 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
}

// ─── Calorie summary header ────────────────────────────────────────
function MacroSummary({ totals, goals }) {
  const calPct = Math.min((totals.calories / (goals.calories || 1)) * 100, 100);

  return (
    <div className="macro-summary-card">
      {/* Big calorie ring */}
      <div className="cal-ring-wrap">
        <div className="cal-ring-svg">
          <MacroRing value={totals.calories} goal={goals.calories} color="#a855f7" size={120} stroke={10} />
          <div className="cal-ring-inner">
            <div className="cal-ring-num">{totals.calories}</div>
            <div className="cal-ring-label">/ {goals.calories} kcal</div>
          </div>
        </div>
      </div>

      {/* Macro bars */}
      <div className="macro-bars">
        {[
          { key: 'protein', label: 'Protein', color: '#a855f7', unit: 'g' },
          { key: 'carbs',   label: 'Carbs',   color: '#10b981', unit: 'g' },
          { key: 'fat',     label: 'Fat',      color: '#f59e0b', unit: 'g' },
        ].map(({ key, label, color, unit }) => {
          const val  = totals[key];
          const goal = goals[key];
          const pct  = Math.min((val / (goal || 1)) * 100, 100);
          return (
            <div key={key} className="macro-bar-item">
              <div className="macro-bar-labels">
                <span style={{ color }}>{label}</span>
                <span className="macro-bar-val">{val}{unit} <span className="macro-bar-goal">/ {goal}{unit}</span></span>
              </div>
              <div className="macro-bar-track">
                <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Food search ──────────────────────────────────────────────────
function FoodSearch({ onAdd, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(QUICK_FOODS);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [servings, setServings]  = useState(1);

  const handleSearch = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) {
      setResults(QUICK_FOODS);
      return;
    }
    // Immediately show local matches while API loads
    const local = QUICK_FOODS.filter(f =>
      f.name.toLowerCase().includes(q.toLowerCase()) ||
      f.brand.toLowerCase().includes(q.toLowerCase())
    );
    setResults(local.length ? local : QUICK_FOODS);
    setLoading(true);
    try {
      const res = await searchFood(q);
      if (res.length) setResults([...local, ...res.filter(r => !local.some(l => l.name === r.name))]);
    } catch {
      // keep local results on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, servings });
  };

  const m = selected ? macrosFor({ ...selected, servings }) : null;

  return (
    <div className="food-search-drawer">
      <div className="food-search-header">
        <span className="food-search-title">Add Food</span>
        <button className="btn-back" onClick={onClose} style={{ width: 32, height: 32 }}><X size={16} /></button>
      </div>

      {/* Search input */}
      <div className="food-search-input-wrap">
        <Search size={16} color="var(--muted)" />
        <input
          className="food-search-input"
          placeholder="Search food (e.g. chicken, rice, banana)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        {loading && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
      </div>

      {/* Scrollable area */}
      <div className="food-search-scroll">
        {/* Selected item preview */}
        {selected && (
          <div className="food-selected-card">
            <div className="food-selected-name">{selected.name}</div>
            <div className="servings-row">
              <span className="food-selected-label">Servings (×100g)</span>
              <div className="servings-ctrl">
                <button onClick={() => setServings(s => Math.max(0.5, +(s - 0.5).toFixed(1)))}>−</button>
                <span>{servings}</span>
                <button onClick={() => setServings(s => +(s + 0.5).toFixed(1))}>+</button>
              </div>
            </div>
            <div className="food-macro-pills">
              <span className="macro-pill purple">{m.calories} kcal</span>
              <span className="macro-pill">{m.protein}g P</span>
              <span className="macro-pill">{m.carbs}g C</span>
              <span className="macro-pill">{m.fat}g F</span>
            </div>
            <button className="btn-primary full-width" style={{ padding: '12px', fontSize: 14 }} onClick={handleAdd}>
              Add to Meal
            </button>
            <button className="meal-add-btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => setSelected(null)}>
              ← Back to results
            </button>
          </div>
        )}

        {/* Results list */}
        {!selected && (
          <div className="food-results">
            {results.map((food) => {
              const m = macrosFor(food);
              return (
                <button key={food.id} className="food-result-item" onClick={() => { setSelected(food); setServings(1); }}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div className="food-result-name">{food.name}</div>
                    {food.brand && <div className="food-result-brand">{food.brand}</div>}
                  </div>
                  <span className="macro-pill purple" style={{ flexShrink: 0 }}>{m.calories} kcal</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Meal section ─────────────────────────────────────────────────
function MealSection({ meal, foods, onRemove, onOpenSearch }) {
  const [open, setOpen] = useState(true);
  const totals = sumMacros(foods);

  return (
    <div className="meal-section">
      <button className="meal-header" onClick={() => setOpen(o => !o)}>
        <span className="meal-emoji">{meal.emoji}</span>
        <span className="meal-label">{meal.label}</span>
        <span className="meal-cal">{totals.calories} kcal</span>
        {open ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
      </button>

      {open && (
        <div className="meal-body">
          {foods.length === 0 && <p className="meal-empty">No foods logged yet</p>}
          {foods.map((food, i) => {
            const m = macrosFor(food);
            return (
              <div key={i} className="meal-food-item">
                <div className="meal-food-info">
                  <span className="meal-food-name">{food.name}</span>
                  <span className="meal-food-meta">{food.servings}× · {m.calories} kcal · {m.protein}g P</span>
                </div>
                <button className="meal-food-remove" onClick={() => onRemove(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button className="meal-add-btn" onClick={() => onOpenSearch(meal.id)}>
            <Plus size={15} /> Add food
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Weight chart (SVG line, full featured) ───────────────────────
function WeightChart({ history, goalKg }) {
  const entries = useMemo(() => {
    return Object.entries(history)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-28)
      .map(([date, kg]) => ({ date, kg: parseFloat(kg) }));
  }, [history]);

  if (entries.length < 2) return (
    <p className="section-desc" style={{ textAlign: 'center', padding: '16px 0' }}>
      Log your weight to see your trend.
    </p>
  );

  const W = 340, H = 140, LPAD = 40, RPAD = 12, TPAD = 12, BPAD = 22;
  const allVals = entries.map(e => e.kg).concat(goalKg ? [goalKg] : []);
  const minW = Math.min(...allVals) - 0.5;
  const maxW = Math.max(...allVals) + 0.5;
  const xOf  = (i) => LPAD + (i / (entries.length - 1)) * (W - LPAD - RPAD);
  const yOf  = (v) => TPAD + (1 - (v - minW) / (maxW - minW)) * (H - TPAD - BPAD);

  const points = entries.map((e, i) => [xOf(i), yOf(e.kg)]);
  const pathD  = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaD  = `${pathD} L ${points[points.length-1][0]} ${H - BPAD} L ${points[0][0]} ${H - BPAD} Z`;

  // Y-axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const val = minW + ((maxW - minW) * i) / (tickCount - 1);
    return { val, y: yOf(val) };
  });

  // Month labels along x-axis
  const xLabels = [];
  let lastMonth = '';
  entries.forEach((e, i) => {
    const month = e.date.slice(5, 7);
    if (month !== lastMonth) { xLabels.push({ i, label: e.date.slice(5, 10) }); lastMonth = month; }
  });

  // Trend: simple linear regression
  const n = entries.length;
  const meanX = (n - 1) / 2;
  const meanY = entries.reduce((s, e) => s + e.kg, 0) / n;
  const slope = entries.reduce((s, e, i) => s + (i - meanX) * (e.kg - meanY), 0) /
                entries.reduce((s, _, i) => s + (i - meanX) ** 2, 0);
  const trendY0 = yOf(meanY + slope * (0 - meanX));
  const trendY1 = yOf(meanY + slope * (n - 1 - meanX));

  return (
    <div className="weight-chart-wrap">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + Y-axis ticks */}
        {ticks.map(({ val, y }) => (
          <g key={val}>
            <line x1={LPAD} x2={W - RPAD} y1={y} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={LPAD - 4} y={y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.35)" fontSize={9}>{val.toFixed(1)}</text>
          </g>
        ))}

        {/* Goal line */}
        {goalKg && (
          <g>
            <line x1={LPAD} x2={W - RPAD} y1={yOf(goalKg)} y2={yOf(goalKg)}
              stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
            <text x={W - RPAD} y={yOf(goalKg) - 4} textAnchor="end"
              fill="#10b981" fontSize={9} opacity={0.9}>Goal</text>
          </g>
        )}

        {/* X-axis baseline */}
        <line x1={LPAD} x2={W - RPAD} y1={H - BPAD} y2={H - BPAD}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Area fill */}
        <path d={areaD} fill="url(#wg2)" />

        {/* Trend line */}
        <line x1={xOf(0)} y1={trendY0} x2={xOf(n - 1)} y2={trendY1}
          stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />

        {/* Main line */}
        <path d={pathD} fill="none" stroke="#a855f7" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots — only every 3rd to avoid clutter on 28 pts */}
        {points.map(([x, y], i) => (
          (i % 3 === 0 || i === points.length - 1) && (
            <circle key={i} cx={x} cy={y} r={3.5}
              fill={i === points.length - 1 ? '#a855f7' : 'var(--surface)'}
              stroke="#a855f7" strokeWidth={2} />
          )
        ))}

        {/* X-axis date labels */}
        {xLabels.slice(0, 4).map(({ i, label }) => (
          <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle"
            fill="rgba(255,255,255,0.3)" fontSize={8}>{label}</text>
        ))}
      </svg>

      {/* Legend */}
      <div className="weight-chart-legend">
        <span><span className="wleg wleg-purple" />Actual</span>
        <span><span className="wleg wleg-amber" />Trend</span>
        {goalKg && <span><span className="wleg wleg-green" />Goal</span>}
      </div>
    </div>
  );
}

// ─── Share ────────────────────────────────────────────────────────
async function shareProgress(totals, weightHistory, repsThisWeek) {
  const today = new Date().toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' });
  const latestWeight = Object.values(weightHistory).slice(-1)[0];
  const text =
    `💪 My Arise Daily Summary — ${today}\n\n` +
    `🍽 Nutrition: ${totals.calories} kcal · ${totals.protein}g protein · ${totals.carbs}g carbs · ${totals.fat}g fat\n` +
    (latestWeight ? `⚖️ Weight: ${latestWeight} kg\n` : '') +
    `\nTracking my screen time, fitness & diet with Arise 👇\nhttps://arise-mauve.vercel.app`;

  if (navigator.share) {
    await navigator.share({ title: 'My Arise Progress', text });
  } else {
    await navigator.clipboard.writeText(text).catch(() => {});
    alert('Summary copied to clipboard!');
  }
}

// ─── Main page ────────────────────────────────────────────────────
export default function Diet() {
  const [log, setLog]           = useState(() => getDietLog());
  const [weightHistory, setWH]  = useState(() => getWeightHistory());
  const [weightInput, setWI]    = useState('');
  const [goalInput, setGI]      = useState('');
  const [goalKg, setGoalKg]     = useState(() => {
    try { return parseFloat(localStorage.getItem('arise_weight_goal') || '') || null; } catch { return null; }
  });
  const [searchMeal, setSearch] = useState(null);
  const goals                   = getDietGoals();

  const refresh = () => setLog(getDietLog());

  const allFoods = useMemo(() =>
    Object.values(log).flat(), [log]);
  const totals = useMemo(() => sumMacros(allFoods), [allFoods]);

  const handleAdd = (mealId, food) => {
    addFoodToMeal(mealId, food);
    refresh();
    setSearch(null);
  };

  const handleRemove = (mealId, index) => {
    removeFoodFromMeal(mealId, index);
    refresh();
  };

  const handleWeightLog = () => {
    const kg = parseFloat(weightInput);
    if (!kg || kg < 20 || kg > 300) return;
    logWeight(kg);
    setWH(getWeightHistory());
    setWI('');
  };

  const handleGoalSave = () => {
    const kg = parseFloat(goalInput);
    if (!kg || kg < 20 || kg > 300) return;
    localStorage.setItem('arise_weight_goal', kg.toString());
    setGoalKg(kg);
    setGI('');
  };

  const sortedWeightEntries = useMemo(() => {
    return Object.entries(weightHistory).sort(([a],[b]) => b.localeCompare(a)); // newest first
  }, [weightHistory]);

  const latestWeight  = sortedWeightEntries[0]?.[1] ?? null;
  const previousWeight = sortedWeightEntries[1]?.[1] ?? null;
  const weightDelta   = latestWeight && previousWeight
    ? Math.round((latestWeight - previousWeight) * 10) / 10
    : null;

  const todayKey    = new Date().toISOString().slice(0,10);
  const todayWeight = weightHistory[todayKey];

  return (
    <div className="page diet-page">
      {/* Header */}
      <div className="diet-header">
        <div>
          <h1 className="page-title">Nutrition</h1>
          <p className="page-subtitle">Today's fuel & progress</p>
        </div>
        <button
          className="share-btn"
          onClick={() => shareProgress(totals, weightHistory)}
          title="Share today's summary"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Macro summary */}
      <MacroSummary totals={totals} goals={goals} />

      {/* Meals */}
      <section className="section">
        <h2 className="section-title">Today's Meals</h2>
        <div className="meals-list">
          {MEALS.map((meal) => (
            <MealSection
              key={meal.id}
              meal={meal}
              foods={log[meal.id] ?? []}
              onRemove={(i) => handleRemove(meal.id, i)}
              onOpenSearch={(id) => setSearch(id)}
            />
          ))}
        </div>
      </section>

      {/* Weight tracker */}
      <section className="section">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={16} /> Weight Tracker
        </h2>

        {/* Stats row */}
        <div className="weight-stats-row">
          <div className="weight-stat-card">
            <div className="weight-stat-label">Current</div>
            <div className="weight-stat-val">
              {latestWeight ? `${latestWeight} kg` : '—'}
            </div>
            {!todayWeight && latestWeight && (
              <div className="weight-stat-sub">last logged</div>
            )}
          </div>
          <div className="weight-stat-card">
            <div className="weight-stat-label">Change</div>
            <div className="weight-stat-val" style={{
              color: weightDelta === null ? 'var(--text)' : weightDelta < 0 ? 'var(--green)' : weightDelta > 0 ? 'var(--red)' : 'var(--text)'
            }}>
              {weightDelta === null ? '—' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  {weightDelta < 0 ? <TrendingDown size={16} /> : weightDelta > 0 ? <TrendingUp size={16} /> : <Minus size={16} />}
                  {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                </span>
              )}
            </div>
            <div className="weight-stat-sub">vs yesterday</div>
          </div>
          <div className="weight-stat-card">
            <div className="weight-stat-label">Goal</div>
            <div className="weight-stat-val" style={{ color: 'var(--green)' }}>
              {goalKg ? `${goalKg} kg` : '—'}
            </div>
            {goalKg && latestWeight && (
              <div className="weight-stat-sub">{Math.abs(latestWeight - goalKg).toFixed(1)} kg to go</div>
            )}
          </div>
        </div>

        {/* Chart */}
        {Object.keys(weightHistory).length > 1 && (
          <WeightChart history={weightHistory} goalKg={goalKg} />
        )}

        {/* Log today's weight */}
        <div className="weight-log-card">
          <p className="weight-log-title">{todayWeight ? `Today: ${todayWeight} kg ✓` : "Log today's weight"}</p>
          <div className="weight-input-row">
            <input
              className="limit-input"
              type="number" step="0.1" min="20" max="300"
              placeholder="e.g. 74.5"
              value={weightInput}
              onChange={(e) => setWI(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWeightLog()}
              style={{ flex: 1, fontSize: 17 }}
            />
            <span className="limit-label">kg</span>
            <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 14 }} onClick={handleWeightLog}>
              Log
            </button>
          </div>

          {/* Goal weight input */}
          <div className="weight-input-row" style={{ marginTop: 8 }}>
            <input
              className="limit-input"
              type="number" step="0.1" min="20" max="300"
              placeholder={goalKg ? `Goal: ${goalKg} kg` : 'Set goal weight…'}
              value={goalInput}
              onChange={(e) => setGI(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoalSave()}
              style={{ flex: 1, fontSize: 17 }}
            />
            <span className="limit-label">kg</span>
            <button className="btn-secondary" style={{ padding: '10px 18px', fontSize: 14 }} onClick={handleGoalSave}>
              Set Goal
            </button>
          </div>
        </div>

        {/* Recent entries */}
        {sortedWeightEntries.length > 0 && (
          <div className="weight-history-list settings-box" style={{ marginTop: 12 }}>
            {sortedWeightEntries.slice(0, 7).map(([date, kg]) => {
              const prev = sortedWeightEntries.find(([d]) => d < date)?.[1];
              const delta = prev ? Math.round((kg - prev) * 10) / 10 : null;
              return (
                <div key={date} className="weight-history-row">
                  <span className="weight-history-date">{date}</span>
                  <span className="weight-history-kg">{kg} kg</span>
                  {delta !== null && (
                    <span className="weight-history-delta" style={{
                      color: delta < 0 ? 'var(--green)' : delta > 0 ? 'var(--red)' : 'var(--muted)'
                    }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Share */}
      <button
        className="btn-secondary full-width"
        style={{ marginBottom: 24, gap: 10 }}
        onClick={() => shareProgress(totals, weightHistory)}
      >
        <Share2 size={18} />
        Share Today's Summary
      </button>

      {/* Food search drawer */}
      {searchMeal && (
        <div className="drawer-backdrop" onClick={() => setSearch(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <FoodSearch
              onAdd={(food) => handleAdd(searchMeal, food)}
              onClose={() => setSearch(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
