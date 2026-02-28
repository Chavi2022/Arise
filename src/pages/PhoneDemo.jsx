import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Search, Bell, Plus, Play, ThumbsUp, Share2 } from 'lucide-react';
import { getUnlockRemaining, grantUnlock, getSettings } from '../utils/storage';

// ─── Demo config ─────────────────────────────────────────────────
const SPEED = 30;          // demo-seconds added per real second
const TRIGGER_SEC = 10;    // real seconds before lock kicks in

const DEMO_APPS = [
  {
    id: 'instagram',
    name: 'Instagram',
    emoji: '📸',
    color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    limitSec: 30 * 60,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    color: 'linear-gradient(135deg, #010101, #69C9D0)',
    limitSec: 30 * 60,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    emoji: '▶️',
    color: 'linear-gradient(135deg, #FF0000, #cc0000)',
    limitSec: 60 * 60,
  },
];

// Start each app just TRIGGER_SEC * SPEED seconds away from its limit
function initialUsage(app) {
  return Math.max(0, app.limitSec - TRIGGER_SEC * SPEED);
}

// ─── Fake post data ───────────────────────────────────────────────
const IG_POSTS = [
  { user: 'alex_runs99',  caption: 'Morning 5K done 💪 who else is up early?', likes: '1.2k', color: '#7c3aed', emoji: '🏃' },
  { user: 'sarah.wellness', caption: 'Rest day smoothie bowl 🥣 self care sunday',  likes: '892',  color: '#ec4899', emoji: '🥗' },
  { user: 'fitlife_daily', caption: 'PR on bench press today!! 🎉 never give up', likes: '3.4k', color: '#f59e0b', emoji: '🏋️' },
  { user: 'outdoors.mike', caption: 'Sunrise hike hit different this morning',       likes: '567',  color: '#10b981', emoji: '🌄' },
];

const TT_VIDEOS = [
  { user: '@dancequeen', desc: 'This trend is taking over 😭😭', likes: '84.2K', color: '#7c3aed', emoji: '💃' },
  { user: '@fitcheck2026', desc: 'POV: you finally hit your PR', likes: '231K', color: '#ec4899', emoji: '🔥' },
];

const YT_VIDEOS = [
  { title: '10 habits that changed my life',        channel: 'MindsetPro',    views: '2.1M views', emoji: '🧠', color: '#7c3aed' },
  { title: 'Full body workout no equipment',         channel: 'FitWithAlex',   views: '890K views', emoji: '💪', color: '#ec4899' },
  { title: 'What I eat in a day (athlete edition)', channel: 'NutritionNerd', views: '1.4M views', emoji: '🥗', color: '#10b981' },
  { title: 'Morning routine that actually works',    channel: 'DailyReset',    views: '3.2M views', emoji: '☀️', color: '#f59e0b' },
];

// ─── Mock feeds ───────────────────────────────────────────────────
function MockInstagram() {
  return (
    <div className="mock-app-content">
      {/* header */}
      <div className="mock-ig-header">
        <span className="mock-logo">Instagram</span>
        <div className="mock-header-icons">
          <Plus size={24} />
          <Heart size={24} />
          <Send size={24} />
        </div>
      </div>
      {/* stories */}
      <div className="mock-stories">
        {['Your Story', 'alex_r', 'sarah.w', 'fitlife', 'mike_o', 'jess_f'].map((s, i) => (
          <div key={i} className="mock-story">
            <div className="mock-story-avatar" style={{ background: `hsl(${i * 55},70%,55%)` }}>
              {i === 0 ? <Plus size={18} color="#fff" /> : s[0].toUpperCase()}
            </div>
            <span>{s.length > 6 ? s.slice(0, 6) : s}</span>
          </div>
        ))}
      </div>
      {/* posts */}
      {IG_POSTS.map((p, i) => (
        <div key={i} className="mock-ig-post">
          <div className="mock-post-header">
            <div className="mock-avatar" style={{ background: p.color }}>{p.emoji}</div>
            <span className="mock-username">{p.user}</span>
            <MoreHorizontal size={18} color="#888" style={{ marginLeft: 'auto' }} />
          </div>
          <div className="mock-post-image" style={{ background: `${p.color}33` }}>
            <span style={{ fontSize: 64 }}>{p.emoji}</span>
          </div>
          <div className="mock-post-actions">
            <Heart size={24} /> <MessageCircle size={24} /> <Send size={24} />
            <Bookmark size={24} style={{ marginLeft: 'auto' }} />
          </div>
          <div className="mock-post-likes">{p.likes} likes</div>
          <div className="mock-post-caption"><strong>{p.user}</strong> {p.caption}</div>
        </div>
      ))}
    </div>
  );
}

function MockTikTok() {
  const video = TT_VIDEOS[0];
  return (
    <div className="mock-tt-wrap">
      <div className="mock-tt-video" style={{ background: `${video.color}22` }}>
        <span style={{ fontSize: 80 }}>{video.emoji}</span>
        <div className="mock-tt-play"><Play size={40} fill="#fff" color="#fff" /></div>
      </div>
      <div className="mock-tt-side">
        <div className="mock-tt-btn"><Heart size={28} fill="#fff" color="#fff" /><span>84.2K</span></div>
        <div className="mock-tt-btn"><MessageCircle size={28} color="#fff" /><span>4.1K</span></div>
        <div className="mock-tt-btn"><Share2 size={28} color="#fff" /><span>2.3K</span></div>
        <div className="mock-tt-avatar" style={{ background: video.color }}>🎵</div>
      </div>
      <div className="mock-tt-info">
        <span className="mock-tt-user">{video.user}</span>
        <span className="mock-tt-desc">{video.desc}</span>
      </div>
      {/* nav bar */}
      <div className="mock-tt-nav">
        {['Home','Friends','+','Inbox','Profile'].map((l, i) => (
          <span key={i} className={`mock-tt-tab ${i === 0 ? 'active' : ''}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function MockYouTube() {
  return (
    <div className="mock-app-content">
      <div className="mock-yt-header">
        <span className="mock-logo" style={{ color: '#FF0000' }}>▶ YouTube</span>
        <div className="mock-header-icons"><Search size={22} /><Bell size={22} /></div>
      </div>
      <div className="mock-yt-chips">
        {['All','Fitness','Music','Gaming','News'].map((c, i) => (
          <span key={i} className={`mock-chip ${i === 0 ? 'active' : ''}`}>{c}</span>
        ))}
      </div>
      {YT_VIDEOS.map((v, i) => (
        <div key={i} className="mock-yt-video">
          <div className="mock-yt-thumb" style={{ background: `${v.color}33` }}>
            <span style={{ fontSize: 48 }}>{v.emoji}</span>
            <div className="mock-yt-duration">4:32</div>
          </div>
          <div className="mock-yt-info">
            <div className="mock-avatar sm" style={{ background: v.color }}>{v.emoji}</div>
            <div>
              <div className="mock-yt-title">{v.title}</div>
              <div className="mock-yt-meta">{v.channel} · {v.views}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Lock overlay ─────────────────────────────────────────────────
function LockOverlay({ app, remaining, onChallenge, onDismiss }) {
  const settings = getSettings();
  const [remSec, setRemSec] = useState(Math.floor(remaining / 1000));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (remaining > 0) {
    return (
      <div className="lock-overlay unlocked-state">
        <div className="lock-card">
          <span style={{ fontSize: 56 }}>{app.emoji}</span>
          <h2>{app.name} Unlocked</h2>
          <div className="lock-timer green">{fmt(remSec)}</div>
          <p className="lock-sub">remaining</p>
          <button className="btn-ghost full-width" onClick={onDismiss}>Keep Scrolling →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lock-overlay">
      <div className="lock-card">
        <div className="lock-icon">🔒</div>
        <h2>Time Limit Reached</h2>
        <p className="lock-sub">
          You've reached your daily limit for <strong>{app.name}</strong>.
        </p>
        <div className="lock-divider" />
        <p className="lock-challenge-label">Complete a challenge to unlock for</p>
        <div className="lock-reward">{settings.unlockMinutes} minutes</div>
        <div className="lock-exercises">
          <span>🏋️ {settings.reps?.PUSH_UP ?? 10} Push-ups</span>
          <span>🦵 {settings.reps?.SQUAT ?? 20} Squats</span>
          <span>🧘 {settings.seconds?.PLANK ?? 60}s Plank</span>
          <span>🤸 {settings.reps?.SIT_UP ?? 15} Sit-ups</span>
        </div>
        <button className="btn-primary full-width" style={{ marginTop: 20 }} onClick={onChallenge}>
          Do a Challenge →
        </button>
      </div>
    </div>
  );
}

// ─── Home screen ──────────────────────────────────────────────────
function HomeScreen({ onOpen, usageMap, unlockMap }) {
  const now = Date.now();
  return (
    <div className="demo-home">
      <div className="demo-status-bar">
        <span>9:41</span>
        <span>●●●</span>
      </div>
      <div className="demo-wallpaper" />
      <div className="demo-app-grid">
        {DEMO_APPS.map((app) => {
          const used = usageMap[app.id] ?? initialUsage(app);
          const pct = Math.min(used / app.limitSec, 1);
          const locked = pct >= 1 && !unlockMap[app.id];
          return (
            <button key={app.id} className="demo-app-icon" onClick={() => onOpen(app)}>
              <div className="demo-app-bubble" style={{ background: app.color }}>
                <span>{app.emoji}</span>
                {locked && <div className="demo-lock-badge">🔒</div>}
              </div>
              <span className="demo-app-name">{app.name}</span>
              <div className="demo-usage-ring-wrap">
                <div
                  className="demo-usage-ring-fill"
                  style={{ width: `${pct * 100}%`, background: locked ? '#ef4444' : '#a855f7' }}
                />
              </div>
            </button>
          );
        })}
        {/* Placeholder icons */}
        {['📞','📷','🗺️','⚙️','💬','🎵','📧','🌐'].map((e, i) => (
          <div key={i} className="demo-app-icon">
            <div className="demo-app-bubble grey"><span>{e}</span></div>
            <span className="demo-app-name">&nbsp;</span>
          </div>
        ))}
      </div>
      <div className="demo-dock">
        <div className="demo-app-bubble grey sm"><span>📞</span></div>
        <div className="demo-app-bubble grey sm"><span>📧</span></div>
        <div className="demo-app-bubble grey sm"><span>🌐</span></div>
        <div className="demo-app-bubble grey sm"><span>🎵</span></div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function PhoneDemo() {
  const navigate = useNavigate();
  const [currentApp, setCurrentApp] = useState(null);
  const [usageMap, setUsageMap] = useState(() =>
    Object.fromEntries(DEMO_APPS.map((a) => [a.id, initialUsage(a)]))
  );
  const [unlockMap, setUnlockMap] = useState({});
  const tickRef = useRef(null);
  // Use a ref so the tick interval can read the latest unlockMap
  // WITHOUT being listed as a dependency (which would reset the interval every second)
  const unlockMapRef = useRef({});

  // Keep ref in sync with state
  useEffect(() => { unlockMapRef.current = unlockMap; }, [unlockMap]);

  // Refresh unlock status every second
  useEffect(() => {
    const refresh = () => {
      const um = {};
      DEMO_APPS.forEach((a) => { um[a.id] = getUnlockRemaining(a.id); });
      setUnlockMap(um);
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, []);

  // Simulate usage while app is open — only depends on currentApp so interval is stable
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!currentApp) return;
    tickRef.current = setInterval(() => {
      // Read unlock status via ref (no stale closure)
      if (unlockMapRef.current[currentApp.id] > 0) return;
      setUsageMap((prev) => ({
        ...prev,
        [currentApp.id]: (prev[currentApp.id] ?? 0) + SPEED,
      }));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [currentApp]); // ← only currentApp, not unlockMap

  const openApp = (app) => setCurrentApp(app);
  const closeApp = () => setCurrentApp(null);

  const isLocked = currentApp
    ? (usageMap[currentApp.id] ?? 0) >= currentApp.limitSec && !unlockMap[currentApp.id]
    : false;

  const handleChallenge = () => {
    navigate('/challenge', { state: { app: currentApp } });
  };

  const renderFeed = () => {
    switch (currentApp?.id) {
      case 'instagram': return <MockInstagram />;
      case 'tiktok':    return <MockTikTok />;
      case 'youtube':   return <MockYouTube />;
      default:          return null;
    }
  };

  return (
    <div className="demo-page">
      {!currentApp ? (
        <HomeScreen onOpen={openApp} usageMap={usageMap} unlockMap={unlockMap} />
      ) : (
        <div className="mock-app-shell">
          {/* Status bar */}
          <div className="mock-status-bar">
            <button className="mock-back-btn" onClick={closeApp}>
              <ChevronLeft size={18} /> Home
            </button>
            <span className="mock-time">9:41</span>
            <span className="mock-battery">●●</span>
          </div>

          {/* App feed */}
          <div className="mock-app-scroll">
            {renderFeed()}
          </div>

          {/* Lock overlay */}
          {(isLocked || unlockMap[currentApp.id] > 0) && (
            <LockOverlay
              app={currentApp}
              remaining={unlockMap[currentApp.id] ?? 0}
              onChallenge={handleChallenge}
              onDismiss={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
}
