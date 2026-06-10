import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/search', icon: Search, label: '发现' },
  { to: '/notifications', icon: Bell, label: '消息' },
  { to: '/profile/', icon: User, label: '我', needsAuth: true },
];

export default function TabBar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-app-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-12">
        {tabs.map((tab) => {
          const to = tab.needsAuth && user ? `/profile/${user.id}` : tab.to;
          const active = tab.to === '/search'
            ? location.pathname === '/search'
            : tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 transition-colors ${
                active ? 'text-app-blue' : 'text-app-subtext'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
