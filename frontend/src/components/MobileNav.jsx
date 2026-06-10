import { NavLink } from 'react-router-dom';
import { Home, Mail, PlusCircle, Search, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const { isAuthenticated, user } = useAuth();
  const links = [
    { to: '/', label: '首页', icon: Home },
    { to: '/search', label: '发现', icon: Search },
    { to: '/create', label: '写作', icon: PlusCircle, auth: true },
    { to: '/chat', label: '私信', icon: Mail, auth: true },
    { to: isAuthenticated ? `/profile/${user?.id}` : '/login', label: '我的', icon: UserRound },
  ].filter((link) => !link.auth || isAuthenticated);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-app-border bg-white/95 backdrop-blur">
      <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[10px] ${isActive ? 'text-app-blue' : 'text-app-subtext'}`}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
