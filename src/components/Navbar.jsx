import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Salad, BarChart2, Users, Settings } from 'lucide-react';

const tabs = [
  { path: '/',         icon: LayoutDashboard, label: 'Home'     },
  { path: '/demo',     icon: Smartphone,      label: 'Demo'     },
  { path: '/diet',     icon: Salad,           label: 'Nutrition'},
  { path: '/progress', icon: BarChart2,       label: 'Progress' },
  { path: '/social',   icon: Users,           label: 'Social'   },
  { path: '/settings', icon: Settings,        label: 'Settings' },
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
