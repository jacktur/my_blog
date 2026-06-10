import { useState } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Moon, Search, PlusCircle, Sun } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { getDisplayName } from '../utils/displayName';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-app-border bg-app-card/88 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1380px] items-center justify-between px-3 sm:px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-blue text-sm font-bold text-white shadow-sm">G</span>
          <span className="hidden text-lg font-semibold tracking-normal text-app-text sm:inline">Geek Blog</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-xl mx-4 lg:mx-8">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章..."
              maxLength={50}
              className="h-9 w-full rounded-lg border border-app-border bg-app-bg pl-9 pr-3 text-sm text-app-text
                placeholder-app-subtext transition-all focus:border-app-blue/40 focus:bg-app-card
                focus:outline-none focus:ring-2 focus:ring-app-blue/15"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationDropdown />

          {isAuthenticated ? (
            <>
              <Link
                to="/create"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-app-blue px-3 text-sm font-medium text-white
                  transition-colors hover:bg-app-blue/90 sm:px-4"
              >
                <PlusCircle size={15} />
                <span className="hidden sm:inline">写文章</span>
              </Link>

              <button
                onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-app-subtext transition-colors hover:bg-app-bg hover:text-app-text"
                title="主题切换"
              >
                {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="h-9 w-9 overflow-hidden rounded-lg ring-1 ring-app-border transition-all hover:ring-app-blue/50"
                >
                  <img
                    src={getAvatarUrl(user?.avatar)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/uploads/avatars/defaults/default-1.svg'; }}
                  />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-lg">
                      <div className="px-4 py-3 border-b border-app-border">
                        <p className="text-sm font-semibold text-app-text">{getDisplayName(user)}</p>
                        <p className="text-xs text-app-subtext">@{user?.username}</p>
                      </div>
                      <Link to={`/profile/${user?.id}`} onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        我的主页
                      </Link>
                      <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        控制台
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                          内容审核
                        </Link>
                      )}
                      <Link to="/reading-list" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        收藏列表
                      </Link>
                      <Link to="/drafts" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        草稿箱
                      </Link>
                      <Link to="/settings" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        设置
                      </Link>
                      <div className="border-t border-app-border">
                        <button onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-sm text-app-red hover:bg-red-50 transition-colors">
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-bg hover:text-app-blue"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="flex h-9 items-center rounded-lg bg-app-blue px-4 text-sm font-medium text-white
                  transition-colors hover:bg-app-blue/90"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
