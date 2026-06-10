import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileText, Home, Compass, Flame, Mail, Users, Star, Users2, Plus, Trophy, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const coreLinks = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/search', icon: Compass, label: '发现' },
  { to: '/?tab=hot', icon: Flame, label: '热门' },
  { to: '/chat', icon: Mail, label: '私信' },
  { to: '/series', icon: BookOpen, label: '系列' },
];

const followLinks = [
  { to: '/following', icon: Users, label: '全部关注' },
  { to: '#', icon: Star, label: '特别关注', disabled: true },
  { to: '#', icon: Users2, label: '好友圈', disabled: true },
];

const otherLinks = [
  { to: '/drafts', icon: FileText, label: '草稿箱', auth: true },
  { to: '/leaderboard', icon: Trophy, label: '排行榜' },
  { to: '/achievements', icon: Award, label: '成就中心' },
];

function SidebarLink({ to, icon: Icon, label, disabled }) {
  const location = useLocation();
  const [path, search = ''] = to.split('?');
  const isActive = location.pathname === path && (search ? location.search === `?${search}` : location.search === '');

  if (disabled) {
    return (
      <span className="flex h-10 cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 text-sm text-app-subtext opacity-45">
        <Icon size={18} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <Link
      to={to}
      className={
        `flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
          isActive
            ? 'bg-app-blue text-white font-semibold shadow-sm'
            : 'text-app-text hover:bg-app-card'
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export default function LeftSidebar() {
  const { isAuthenticated } = useAuth();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-2">
        <div className="rounded-xl border border-app-border bg-app-card p-2 shadow-card">
        {/* Core navigation */}
        {coreLinks.map((link) => (
          <SidebarLink key={link.to} {...link} />
        ))}
        </div>

        {/* Follow groups */}
        {isAuthenticated && (
          <div className="mt-3 rounded-xl border border-app-border bg-app-card p-2 shadow-card">
            <h3 className="px-3 pb-2 pt-1 text-xs font-semibold text-app-subtext">
              关注分组
            </h3>
            {followLinks.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </div>
        )}

        {/* Custom groups */}
        {isAuthenticated && (
          <div className="mt-3 rounded-xl border border-app-border bg-app-card p-2 shadow-card">
            <h3 className="px-3 pb-2 pt-1 text-xs font-semibold text-app-subtext">
              自定义分组
            </h3>
            <span className="flex h-10 cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 text-sm text-app-subtext opacity-45">
              <Plus size={18} />
              <span>新建分组</span>
            </span>
          </div>
        )}

        {/* Other */}
        <div className="mt-3 rounded-xl border border-app-border bg-app-card p-2 shadow-card">
          <h3 className="px-3 pb-2 pt-1 text-xs font-semibold text-app-subtext">
            其他
          </h3>
          {otherLinks.filter(link => !link.auth || isAuthenticated).map((link) => (
            <SidebarLink key={link.to} {...link} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
