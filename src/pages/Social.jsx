import { useState, useMemo } from 'react';
import {
  Users, Trophy, Target, UserPlus, X, Flame, Dumbbell,
  Crown, Trash2, Plus, Activity, Award,
} from 'lucide-react';
import {
  getFriends, addFriend, removeFriend,
  getSharedGoals, addSharedGoal, removeSharedGoal,
  getProfile, getUserStats, getLastWeekPlacements,
  GOAL_EXERCISES,
} from '../utils/socialStorage';
import { getProgress, getStreak } from '../utils/storage';

// ─── Shared components ───────────────────────────────────────────

function Avatar({ name, color, size = 40 }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <div className="social-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

// ─── SVG Pie Chart ───────────────────────────────────────────────

function PieChart({ slices, size = 140 }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--surface3)" strokeWidth="20" />
      </svg>
    );
  }

  const paths = [];
  let cumulative = 0;
  slices.forEach((sl) => {
    if (sl.value <= 0) return;
    const startAngle = (cumulative / total) * 360;
    const sliceAngle = (sl.value / total) * 360;
    cumulative += sl.value;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + sliceAngle - 90) * Math.PI) / 180;
    const r = 60;
    const cx = 70, cy = 70;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = sliceAngle > 180 ? 1 : 0;

    if (sliceAngle >= 359.99) {
      paths.push(
        <circle key={sl.label} cx={cx} cy={cy} r={r} fill={sl.color} />
      );
    } else {
      paths.push(
        <path
          key={sl.label}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
          fill={sl.color}
        />
      );
    }
  });

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" style={{ display: 'block' }}>
      {paths}
      <circle cx="70" cy="70" r="36" fill="var(--surface)" />
      <text x="70" y="66" textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="900">
        {total}
      </text>
      <text x="70" y="82" textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="600">
        TOTAL
      </text>
    </svg>
  );
}

// ─── Friend Card ─────────────────────────────────────────────────

function FriendCard({ friend, onRemove }) {
  return (
    <div className="friend-card">
      <div className="friend-card-left">
        <Avatar name={friend.name} color={friend.color} size={42} />
        <div className="friend-info">
          <span className="friend-name">{friend.name}</span>
          <div className="friend-stats-row">
            <span className="friend-stat"><Flame size={12} /> {friend.streak}d</span>
            <span className="friend-stat"><Dumbbell size={12} /> {friend.totalReps.toLocaleString()}</span>
            <span className="friend-stat">
              <Activity size={12} />
              {friend.todayExercises > 0
                ? `${friend.todayExercises} today`
                : 'Rest day'}
            </span>
          </div>
        </div>
      </div>
      <button className="friend-remove" onClick={() => onRemove(friend.id)} title="Remove friend">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Leaderboard Row ─────────────────────────────────────────────

function LeaderboardRow({ entry, index, isYou, lastWeekPlacement }) {
  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
  return (
    <div className={`lb-row ${isYou ? 'lb-you' : ''}`}>
      <span className="lb-rank">{medal ?? `#${index + 1}`}</span>
      <Avatar name={entry.name} color={entry.color} size={32} />
      <div className="lb-info">
        <div className="lb-name-row">
          <span className="lb-name">{entry.name}{isYou && ' (You)'}</span>
          {lastWeekPlacement && (
            <span className={`lb-badge lb-badge-${lastWeekPlacement.rank}`}>
              <Award size={10} />
              {lastWeekPlacement.title}
            </span>
          )}
        </div>
        <span className="lb-streak"><Flame size={11} /> {entry.streak}d streak</span>
      </div>
      <div className="lb-score">
        <span className="lb-reps">{entry.totalReps.toLocaleString()}</span>
        <span className="lb-reps-label">reps</span>
      </div>
    </div>
  );
}

// ─── Goal Card (clickable) ───────────────────────────────────────

function GoalCard({ goal, friends, profile, onRemove, onSelect }) {
  const pct = Math.min((goal.currentReps / goal.targetReps) * 100, 100);
  const daysLeft = Math.max(0, Math.ceil((goal.deadline - Date.now()) / 86400000));
  const participants = goal.participants
    .map((pid) => friends.find((f) => f.id === pid))
    .filter(Boolean);
  const exercise = GOAL_EXERCISES.find((e) => e.id === goal.exerciseType);

  return (
    <button className="goal-card goal-card-btn" onClick={() => onSelect(goal)}>
      <div className="goal-header">
        <div className="goal-title-area">
          {exercise ? (
            <span className="goal-exercise-emoji">{exercise.emoji}</span>
          ) : (
            <Target size={16} color="var(--purple-light)" />
          )}
          <div className="goal-title-col">
            <span className="goal-title">{goal.title}</span>
            {exercise && (
              <span className="goal-exercise-tag">{exercise.name} · {goal.targetReps} {exercise.unit}</span>
            )}
          </div>
        </div>
        <button className="goal-remove" onClick={(e) => { e.stopPropagation(); onRemove(goal.id); }}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="goal-progress-wrap">
        <div className="goal-progress-track">
          <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="goal-progress-text">
          {goal.currentReps} / {goal.targetReps}
        </span>
      </div>
      <div className="goal-footer">
        <div className="goal-participants">
          {participants.map((p) => (
            <Avatar key={p.id} name={p.name} color={p.color} size={24} />
          ))}
          <Avatar name={profile.name} color={profile.color} size={24} />
        </div>
        <span className="goal-deadline">
          {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
        </span>
      </div>
    </button>
  );
}

// ─── Goal Detail Drawer (pie chart) ──────────────────────────────

function GoalDetailDrawer({ goal, friends, profile, onClose }) {
  const contribs = goal.contributions ?? {};
  const exercise = GOAL_EXERCISES.find((e) => e.id === goal.exerciseType);
  const participantEntries = goal.participants
    .map((pid) => {
      const f = friends.find((fr) => fr.id === pid);
      if (!f) return null;
      return { id: pid, name: f.name, color: f.color, value: contribs[pid] ?? 0 };
    })
    .filter(Boolean);
  const myValue = contribs['_me'] ?? 0;

  const allSlices = [
    { label: profile.name, color: profile.color, value: myValue },
    ...participantEntries.map((p) => ({ label: p.name, color: p.color, value: p.value })),
  ];

  const total = allSlices.reduce((s, sl) => s + sl.value, 0);
  const pct = goal.targetReps > 0 ? Math.min((goal.currentReps / goal.targetReps) * 100, 100) : 0;
  const unit = exercise?.unit ?? 'reps';

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="food-search-drawer">
          <div className="food-search-header">
            <span className="food-search-title">{goal.title}</span>
            <button className="btn-back" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="food-search-scroll">
            {exercise && (
              <div className="goal-detail-exercise-badge">
                <span>{exercise.emoji}</span>
                <span>{exercise.name}</span>
                <span className="goal-detail-exercise-unit">{goal.targetReps} {unit}</span>
              </div>
            )}

            <div className="goal-detail-chart">
              <PieChart slices={allSlices} size={160} />
            </div>

            <div className="goal-detail-progress">
              <div className="goal-progress-track" style={{ height: 8 }}>
                <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="goal-detail-progress-labels">
                <span>{goal.currentReps} {unit} done</span>
                <span>{goal.targetReps} {unit} goal</span>
              </div>
            </div>

            <div className="goal-detail-legend">
              {allSlices.map((sl) => (
                <div key={sl.label} className="goal-legend-row">
                  <div className="goal-legend-left">
                    <span className="goal-legend-dot" style={{ background: sl.color }} />
                    <span className="goal-legend-name">{sl.label}</span>
                  </div>
                  <div className="goal-legend-right">
                    <span className="goal-legend-value">{sl.value} <small style={{ color: 'var(--muted)', fontWeight: 400 }}>{unit}</small></span>
                    <span className="goal-legend-pct">
                      {total > 0 ? `${Math.round((sl.value / total) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Friend Drawer ───────────────────────────────────────────

function AddFriendDrawer({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      onClose();
    }
  };
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="food-search-drawer">
          <div className="food-search-header">
            <span className="food-search-title">Add Friend</span>
            <button className="btn-back" onClick={onClose}><X size={18} /></button>
          </div>
          <p className="section-desc">Enter your friend's name to connect and start competing together.</p>
          <form onSubmit={handleSubmit}>
            <div className="food-search-input-wrap">
              <UserPlus size={18} color="var(--muted)" />
              <input
                className="food-search-input"
                placeholder="Friend's name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary full-width" disabled={!name.trim()}>
              <UserPlus size={16} />
              Add Friend
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Add Goal Drawer ─────────────────────────────────────────────

function AddGoalDrawer({ friends, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(100);
  const [days, setDays] = useState(7);
  const [exerciseType, setExerciseType] = useState('PUSH_UP');
  const [selected, setSelected] = useState([]);

  const selectedExercise = GOAL_EXERCISES.find((e) => e.id === exerciseType);

  const toggleParticipant = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && selected.length > 0 && exerciseType) {
      onAdd({ title: title.trim(), targetReps: target, participants: selected, deadlineDays: days, exerciseType });
      onClose();
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="food-search-drawer">
          <div className="food-search-header">
            <span className="food-search-title">New Shared Goal</span>
            <button className="btn-back" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="food-search-scroll">
            <form onSubmit={handleSubmit} className="goal-form">
              <div className="goal-field">
                <label className="goal-field-label">Goal name</label>
                <div className="food-search-input-wrap">
                  <input
                    className="food-search-input"
                    placeholder="e.g. 500 Push-ups This Week"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="goal-field">
                <label className="goal-field-label">Exercise</label>
                <div className="goal-exercise-select-list">
                  {GOAL_EXERCISES.map((ex) => (
                    <button key={ex.id} type="button"
                      className={`goal-exercise-option ${exerciseType === ex.id ? 'selected' : ''}`}
                      onClick={() => setExerciseType(ex.id)}>
                      <span className="goal-exercise-option-emoji">{ex.emoji}</span>
                      <span>{ex.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="goal-field-row">
                <div className="goal-field">
                  <label className="goal-field-label">Target {selectedExercise?.unit ?? 'reps'}</label>
                  <input type="number" className="limit-input" value={target} min={1} max={10000}
                    onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div className="goal-field">
                  <label className="goal-field-label">Duration (days)</label>
                  <input type="number" className="limit-input" value={days} min={1} max={90}
                    onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
              <div className="goal-field">
                <label className="goal-field-label">Invite friends</label>
                <div className="goal-friend-list">
                  {friends.map((f) => (
                    <button key={f.id} type="button"
                      className={`goal-friend-chip ${selected.includes(f.id) ? 'selected' : ''}`}
                      onClick={() => toggleParticipant(f.id)}>
                      <Avatar name={f.name} color={f.color} size={22} />
                      <span>{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary full-width"
                disabled={!title.trim() || selected.length === 0}>
                <Target size={16} />
                Create Goal
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function Social() {
  const [friends, setFriends] = useState(() => getFriends());
  const [goals, setGoals] = useState(() => getSharedGoals());
  const [profile] = useState(() => getProfile());
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [activeTab, setActiveTab] = useState('friends');
  const [lbSort, setLbSort] = useState('totalReps');

  const progress = useMemo(() => getProgress(), []);
  const myStreak = useMemo(() => getStreak(progress), [progress]);
  const myStats = useMemo(() => getUserStats(progress), [progress]);
  const lastWeekPlacements = useMemo(() => getLastWeekPlacements(), []);

  const leaderboard = useMemo(() => {
    const me = {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      streak: myStreak,
      totalReps: myStats.totalReps,
      weekReps: myStats.weekReps,
      challenges: myStats.challenges,
    };
    const all = [me, ...friends];
    return all.sort((a, b) => {
      if (lbSort === 'streak') return b.streak - a.streak;
      return b.totalReps - a.totalReps;
    });
  }, [friends, profile, myStreak, myStats, lbSort]);

  const handleAddFriend = (name) => {
    const f = addFriend(name);
    setFriends((prev) => [...prev, f]);
  };

  const handleRemoveFriend = (id) => {
    removeFriend(id);
    setFriends((prev) => prev.filter((f) => f.id !== id));
    setGoals(getSharedGoals());
  };

  const handleAddGoal = (goalData) => {
    const g = addSharedGoal(goalData);
    setGoals((prev) => [...prev, g]);
  };

  const handleRemoveGoal = (id) => {
    removeSharedGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="page social-page">
      <h1 className="page-title">Social</h1>
      <p className="page-subtitle">Compete, connect & stay accountable</p>

      <div className="social-tabs">
        {[
          { id: 'friends', icon: Users, label: 'Friends' },
          { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
          { id: 'goals', icon: Target, label: 'Goals' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id}
            className={`social-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Friends Tab ── */}
      {activeTab === 'friends' && (
        <section className="section social-section">
          <div className="social-section-header">
            <h2 className="section-title">Friends · {friends.length}</h2>
            <button className="social-add-btn" onClick={() => setShowAddFriend(true)}>
              <UserPlus size={16} />
              Add
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="empty-state">
              <p>No friends connected yet.</p>
              <p>Add friends to share progress and compete!</p>
            </div>
          ) : (
            <div className="friend-list">
              {friends.map((f) => (
                <FriendCard key={f.id} friend={f} onRemove={handleRemoveFriend} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Leaderboard Tab ── */}
      {activeTab === 'leaderboard' && (
        <section className="section social-section">
          <div className="social-section-header">
            <h2 className="section-title">Leaderboard</h2>
            <div className="lb-sort-toggle">
              <button
                className={`lb-sort-btn ${lbSort === 'totalReps' ? 'active' : ''}`}
                onClick={() => setLbSort('totalReps')}>
                <Dumbbell size={13} /> Reps
              </button>
              <button
                className={`lb-sort-btn ${lbSort === 'streak' ? 'active' : ''}`}
                onClick={() => setLbSort('streak')}>
                <Flame size={13} /> Streak
              </button>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="empty-state">
              <p>Add friends to see the leaderboard!</p>
            </div>
          ) : (
            <div className="lb-list settings-box">
              {leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  isYou={entry.id === profile.id}
                  lastWeekPlacement={lastWeekPlacements[entry.id] ?? null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Goals Tab ── */}
      {activeTab === 'goals' && (
        <section className="section social-section">
          <div className="social-section-header">
            <h2 className="section-title">Shared Goals</h2>
            <button className="social-add-btn" onClick={() => setShowAddGoal(true)}>
              <Plus size={16} />
              New
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="empty-state">
              <p>No shared goals yet.</p>
              <p>Create a goal and invite friends to join!</p>
            </div>
          ) : (
            <div className="goal-list">
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  friends={friends}
                  profile={profile}
                  onRemove={handleRemoveGoal}
                  onSelect={setSelectedGoal}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Drawers */}
      {showAddFriend && (
        <AddFriendDrawer onAdd={handleAddFriend} onClose={() => setShowAddFriend(false)} />
      )}
      {showAddGoal && (
        <AddGoalDrawer friends={friends} onAdd={handleAddGoal} onClose={() => setShowAddGoal(false)} />
      )}
      {selectedGoal && (
        <GoalDetailDrawer
          goal={selectedGoal}
          friends={friends}
          profile={profile}
          onClose={() => setSelectedGoal(null)}
        />
      )}
    </div>
  );
}
