import { useState, useEffect } from 'react';
import { getApps, saveApps, getSettings, saveSettings, DEFAULT_APPS } from '../utils/storage';
import { EXERCISE_LIST } from '../utils/exerciseConfig';
import { RotateCcw } from 'lucide-react';

export default function Settings() {
  const [apps, setApps] = useState(getApps());
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  const handleAppToggle = (id) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleLimitChange = (id, val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, limitMin: num } : a)));
  };

  const handleUnlockMinutes = (val) => {
    setSettings((s) => ({ ...s, unlockMinutes: Math.max(1, parseInt(val) || 15) }));
  };

  const handleReps = (exId, val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setSettings((s) => ({ ...s, reps: { ...s.reps, [exId]: num } }));
  };

  const handleSeconds = (val) => {
    const num = Math.max(5, parseInt(val) || 30);
    setSettings((s) => ({ ...s, seconds: { ...s.seconds, PLANK: num } }));
  };

  const handleSave = () => {
    saveApps(apps);
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setApps(DEFAULT_APPS);
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="page settings-page">
      <h1 className="page-title">Settings</h1>

      {/* App limits */}
      <section className="section">
        <h2 className="section-title">Tracked Apps</h2>
        <p className="section-desc">Toggle apps and set daily time limits in minutes.</p>
        <div className="settings-list settings-box">
          {apps.map((app) => (
            <div key={app.id} className="settings-row">
              <div className="settings-row-left">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={app.enabled}
                    onChange={() => handleAppToggle(app.id)}
                  />
                  <span className="toggle-track" />
                </label>
                <span className="app-emoji">{app.emoji}</span>
                <span className="app-name">{app.name}</span>
              </div>
              <div className="settings-row-right">
                <input
                  type="number"
                  className="limit-input"
                  value={app.limitMin}
                  min={1}
                  max={480}
                  onChange={(e) => handleLimitChange(app.id, e.target.value)}
                  disabled={!app.enabled}
                />
                <span className="limit-label">min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Unlock duration */}
      <section className="section">
        <h2 className="section-title">Unlock Duration</h2>
        <p className="section-desc">How many minutes of access is granted after completing a challenge.</p>
        <div className="settings-row" style={{ border: 'none', padding: 0 }}>
          <span style={{ color: 'var(--text)' }}>Minutes unlocked after challenge</span>
          <div className="settings-row-right">
            <input
              type="number"
              className="limit-input"
              value={settings.unlockMinutes}
              min={1}
              max={120}
              onChange={(e) => handleUnlockMinutes(e.target.value)}
            />
            <span className="limit-label">min</span>
          </div>
        </div>
      </section>

      {/* Challenge amounts */}
      <section className="section">
        <h2 className="section-title">Challenge Amounts</h2>
        <p className="section-desc">Set how many reps or seconds each challenge requires.</p>
        <div className="settings-list settings-box">
          {EXERCISE_LIST.map((ex) => (
            <div key={ex.id} className="settings-row">
              <div className="settings-row-left">
                <span className="app-emoji">{ex.emoji}</span>
                <span className="app-name">{ex.name}</span>
              </div>
              <div className="settings-row-right">
                <input
                  type="number"
                  className="limit-input"
                  min={1}
                  max={ex.type === 'hold' ? 300 : 100}
                  value={
                    ex.type === 'reps'
                      ? settings.reps?.[ex.id] ?? ex.defaultReps
                      : settings.seconds?.PLANK ?? ex.defaultSeconds
                  }
                  onChange={(e) =>
                    ex.type === 'reps' ? handleReps(ex.id, e.target.value) : handleSeconds(e.target.value)
                  }
                />
                <span className="limit-label">{ex.type === 'reps' ? 'reps' : 'sec'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className={`btn-primary full-width ${saved ? 'saved' : ''}`} onClick={handleSave}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      <button className="btn-ghost full-width" style={{ marginTop: 12 }} onClick={handleReset}>
        <RotateCcw size={16} />
        Reset All Data
      </button>
    </div>
  );
}
