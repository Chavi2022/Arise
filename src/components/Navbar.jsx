import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Smartphone, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/demo', icon: Smartphone, label: 'Demo' },
  { path: '/challenge', icon: Dumbbell, label: 'Challenge' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
