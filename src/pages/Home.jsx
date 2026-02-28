import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Zap, Clock, TrendingUp } from 'lucide-react';
import {
  getApps,
  getUsage,
  getUnlockRemaining,
  simulateOverLimit,
} from '../utils/storage';

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AppCard({ app, usedMin, remaining, onUnlock }) {
  const pct = Math.min((usedMin / app.limitMin) * 100, 100);
  const isLocked = usedMin >= app.limitMin && remaining === 0;
  const isUnlocked = remaining > 0;

  return (
    <div className={`app-card ${isLocked ? 'locked' : isUnlocked ? 'unlocked' : ''}`}>
      <div className="app-card-left">
        <span className="app-emoji">{app.emoji}</span>
        <div className="app-info">
          <span className="app-name">{app.name}</span>
          <div className="usage-bar-wrap">
            <div
              className="usage-bar-fill"
              style={{
                width: `${pct}%`,
                background: isLocked ? '#ef4444' : isUnlocked ? '#10b981' : '#7c3aed',
              }}
            />
          </div>
          <span className="usage-label">
            {usedMin} / {app.limitMin} min used
          </span>
        </div>
      </div>

      <div className="app-card-right">
        {isUnlocked ? (
          <div className="unlock-badge">
            <Unlock size={14} />
            <span>{formatMs(remaining)}</span>
          </div>
        ) : isLocked ? (
          <button className="btn-unlock" onClick={() => onUnlock(app)}>
            <Lock size={14} />
            Unlock
          </button>
        ) : (
          <span className="status-ok">Active</span>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [usage, setUsage] = useState({});
  const [remainingMap, setRemainingMap] = useState({});
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setApps(getApps().filter((a) => a.enabled));
    setUsage(getUsage());
    const rm = {};
    getApps().forEach((a) => { rm[a.id] = getUnlockRemaining(a.id); });
    setRemainingMap(rm);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { refresh(); }, [tick]);

  const handleUnlock = (app) => {
    navigate('/challenge', { state: { app } });
  };

  const handleSimulate = () => {
    simulateOverLimit();
    refresh();
  };

  const enabledApps = apps;
  const lockedCount = enabledApps.filter(
    (a) => (usage[a.id] ?? 0) >= a.limitMin && remainingMap[a.id] === 0
  ).length;
  const unlockedCount = enabledApps.filter((a) => remainingMap[a.id] > 0).length;

  return (
    <div className="page home-page">
      <div className="home-header">
        <div>
          <h1 className="page-title">Arise</h1>
          <p className="page-subtitle">Earn your screen time.</p>
        </div>
        <div className="header-badge">⚡</div>
      </div>

      <div className="stats-row">
        <div className="stat-pill">
          <Lock size={16} />
          <span>{lockedCount} locked</span>
        </div>
        <div className="stat-pill green">
          <Unlock size={16} />
          <span>{unlockedCount} unlocked</span>
        </div>
        <div className="stat-pill purple">
          <TrendingUp size={16} />
          <span>{enabledApps.length} tracked</span>
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="alert-banner">
          <Zap size={18} />
          <span>
            {lockedCount} app{lockedCount > 1 ? 's are' : ' is'} locked — complete a challenge to unlock!
          </span>
        </div>
      )}

      <section className="section">
        <h2 className="section-title">Today's Apps</h2>
        {enabledApps.length === 0 ? (
          <div className="empty-state">
            <p>No apps tracked yet.</p>
            <p>Go to Settings to add apps.</p>
          </div>
        ) : (
          <div className="app-list">
            {enabledApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                usedMin={usage[app.id] ?? 0}
                remaining={remainingMap[app.id] ?? 0}
                onUnlock={handleUnlock}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Demo</h2>
        <p className="section-desc">
          Simulate going over your daily limit on all tracked apps to try the unlock flow.
        </p>
        <button className="btn-secondary full-width" onClick={handleSimulate}>
          <Clock size={16} />
          Simulate Over Limit
        </button>
      </section>
    </div>
  );
}
