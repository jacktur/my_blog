import { NavLink } from 'react-router-dom';
import { Home, Compass, Flame, Mail, Users, Star, Users2, Plus, Trophy, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const coreLinks = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/search', icon: Compass, label: '发现' },
  { to: '/?tab=hot', icon: Flame, label: '热门' },
  { to: '/chat', icon: Mail, label: '私信' },
];

const followLinks = [
  { to: '/following', icon: Users, label: '全部关注' },
  { to: '#', icon: Star, label: '特别关注', disabled: true },
  { to: '#', icon: Users2, label: '好友圈', disabled: true },
];

const otherLinks = [
  { to: '/leaderboard', icon: Trophy, label: '排行榜' },
  { to: '/achievements', icon: Award, label: '成就中心' },
];

function SidebarLink({ to, icon: Icon, label, disabled }) {
  if (disabled) {
    return (
      <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-app-subtext opacity-50 cursor-not-allowed select-none">
        <Icon size={18} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-app-blue/10 text-app-blue font-semibold'
            : 'text-app-text hover:bg-app-bg'
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function LeftSidebar() {
  const { isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <nav className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-3 space-y-0.5">
        {/* Core navigation */}
        {coreLinks.map((link) => (
          <SidebarLink key={link.to} {...link} />
        ))}

        {/* Follow groups */}
        {isAuthenticated && (
          <>
            <h3 className="text-xs text-app-subtext font-semibold uppercase tracking-wider px-3 pt-5 pb-1">
              关注分组
            </h3>
            {followLinks.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </>
        )}

        {/* Custom groups */}
        {isAuthenticated && (
          <>
            <h3 className="text-xs text-app-subtext font-semibold uppercase tracking-wider px-3 pt-5 pb-1">
              自定义分组
            </h3>
            <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-app-subtext opacity-50 cursor-not-allowed select-none">
              <Plus size={18} />
              <span>新建分组</span>
            </span>
          </>
        )}

        {/* Other */}
        <h3 className="text-xs text-app-subtext font-semibold uppercase tracking-wider px-3 pt-5 pb-1">
          其他
        </h3>
        {otherLinks.map((link) => (
          <SidebarLink key={link.to} {...link} />
        ))}
      </nav>
    </aside>
  );
}
