import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, PlusCircle, Sun } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 glass border-b border-app-border">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl font-bold tracking-tight text-app-text">Geek</span>
          <span className="text-xl font-light text-app-subtext">Blog</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章..."
              maxLength={50}
              className="w-full h-9 pl-9 pr-3 rounded-full bg-[#E5E5EA]/70 text-sm text-app-text
                placeholder-app-subtext focus:outline-none focus:bg-[#E5E5EA] focus:ring-2
                focus:ring-app-blue/20 transition-all"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationDropdown />

          {isAuthenticated ? (
            <>
              <Link
                to="/create"
                className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-app-blue text-white text-sm font-medium
                  hover:bg-app-blue/90 transition-colors"
              >
                <PlusCircle size={15} />
                <span>写文章</span>
              </Link>

              <button
                className="w-8 h-8 flex items-center justify-center rounded-full text-app-subtext hover:text-app-text hover:bg-app-bg transition-colors"
                title="主题切换"
              >
                <Sun size={17} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-app-border hover:ring-app-blue/50 transition-all"
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
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white shadow-lg border border-app-border
                      overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-app-border">
                        <p className="text-sm font-semibold text-app-text">{user?.username}</p>
                      </div>
                      <Link to={`/profile/${user?.id}`} onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        我的主页
                      </Link>
                      <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        控制台
                      </Link>
                      <Link to="/reading-list" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-app-text hover:bg-app-bg transition-colors">
                        收藏列表
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
                className="text-sm text-app-text hover:text-app-blue transition-colors"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="flex items-center h-8 px-4 rounded-full bg-app-blue text-white text-sm font-medium
                  hover:bg-app-blue/90 transition-colors"
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
