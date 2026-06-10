import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { followUserApi, getRecommendedUsersApi, getTagsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Bookmark, FileText, Hash, LayoutDashboard, UserCheck, UserPlus } from 'lucide-react';

export default function RightSidebar() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [followingId, setFollowingId] = useState(null);

  useEffect(() => {
    getTagsApi()
      .then((res) => setTags(res.data.tags))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getRecommendedUsersApi(user?.id)
      .then((res) => setUsers(res.data.users || []))
      .catch(() => {});
  }, [user?.id]);

  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  const handleFollow = async (targetUserId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setFollowingId(targetUserId);
    try {
      await followUserApi(targetUserId);
      setUsers((prev) => prev.map((item) => (
        item.id === targetUserId ? { ...item, is_following: 1 } : item
      )));
    } catch {
      return undefined;
    } finally {
      setFollowingId(null);
    }
  };

  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-16 space-y-3 py-2">
        {/* Trending topics */}
        <div className="rounded-xl border border-app-border bg-app-card p-4 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-text">
            <Hash size={15} className="text-app-blue" />
            热门话题
          </h3>
          {tags.length === 0 ? (
            <p className="text-app-subtext text-xs">暂无话题</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 12).map((tag) => (
                <Link
                  key={tag.id}
                  to={`/?tag=${encodeURIComponent(tag.name)}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-app-bg px-2.5 py-1.5 text-xs font-medium
                    text-app-subtext transition-all hover:bg-app-blue/10 hover:text-app-blue"
                >
                  #{tag.name}
                  <span className="opacity-60">({tag.article_count})</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recommended users */}
        <div className="rounded-xl border border-app-border bg-app-card p-4 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-text">
            <UserPlus size={15} className="text-app-blue" />
            可能感兴趣的人
          </h3>
          {users.length === 0 ? (
            <p className="text-app-subtext text-xs">暂无推荐用户</p>
          ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-app-bg">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-app-bg">
                  <img
                    src={getAvatarUrl(u.avatar)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/uploads/avatars/defaults/default-1.svg'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${u.id}`}
                    className="text-sm font-medium text-app-text hover:text-app-blue transition-colors truncate block"
                  >
                    {u.nickname || u.username}
                  </Link>
                  <p className="text-xs text-app-subtext truncate">
                    {u.bio || `${u.article_count || 0} 篇文章 · ${u.follower_count || 0} 位粉丝`}
                  </p>
                </div>
                <button
                  onClick={() => handleFollow(u.id)}
                  disabled={followingId === u.id || !!u.is_following}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity disabled:cursor-default disabled:opacity-70
                    ${u.is_following ? 'border border-app-border text-app-subtext' : 'bg-app-blue/10 text-app-blue hover:opacity-80'}`}
                >
                  {u.is_following ? <><UserCheck size={12} />已关注</> : followingId === u.id ? '关注中' : '关注'}
                </button>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Quick links */}
        {isAuthenticated && (
          <div className="rounded-xl border border-app-border bg-app-card p-2 shadow-card">
            <Link
              to="/dashboard"
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-app-subtext transition-colors hover:bg-app-bg hover:text-app-blue"
            >
              <LayoutDashboard size={15} />
              控制台
            </Link>
            <Link
              to="/reading-list"
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-app-subtext transition-colors hover:bg-app-bg hover:text-app-blue"
            >
              <Bookmark size={15} />
              收藏列表
            </Link>
            <Link
              to="/drafts"
              className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-app-subtext transition-colors hover:bg-app-bg hover:text-app-blue"
            >
              <FileText size={15} />
              草稿箱
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-app-subtext/60 px-1">
          Geek Blog &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
