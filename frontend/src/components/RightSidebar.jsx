import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTagsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Hash, UserPlus } from 'lucide-react';

const mockUsers = [
  { id: 1, username: '前端达人', bio: '热爱前端开发', avatar: null },
  { id: 2, username: '后端忍者', bio: 'Go & Rust 爱好者', avatar: null },
  { id: 3, username: '设计师小王', bio: 'UI/UX 设计分享', avatar: null },
];

export default function RightSidebar() {
  const { isAuthenticated } = useAuth();
  const [tags, setTags] = useState([]);

  useEffect(() => {
    getTagsApi()
      .then((res) => setTags(res.data.tags))
      .catch(() => {});
  }, []);

  return (
    <aside className="hidden xl:block w-72 shrink-0">
      <div className="sticky top-14 space-y-4 py-3">
        {/* Trending topics */}
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-app-text mb-3">
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    bg-app-bg text-app-subtext hover:bg-app-blue/10 hover:text-app-blue"
                >
                  #{tag.name}
                  <span className="opacity-60">({tag.article_count})</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recommended users */}
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-app-text mb-3">
            <UserPlus size={15} className="text-app-blue" />
            可能感兴趣的人
          </h3>
          <div className="space-y-3">
            {mockUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-app-bg flex items-center justify-center text-app-subtext text-xs font-bold shrink-0">
                  {u.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${u.id}`}
                    className="text-sm font-medium text-app-text hover:text-app-blue transition-colors truncate block"
                  >
                    {u.username}
                  </Link>
                  <p className="text-xs text-app-subtext truncate">{u.bio}</p>
                </div>
                <button className="text-xs text-app-blue font-medium hover:opacity-80 transition-opacity shrink-0">
                  关注
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        {isAuthenticated && (
          <div className="card p-4 space-y-2">
            <Link
              to="/dashboard"
              className="block text-sm text-app-subtext hover:text-app-blue transition-colors"
            >
              控制台
            </Link>
            <Link
              to="/reading-list"
              className="block text-sm text-app-subtext hover:text-app-blue transition-colors"
            >
              收藏列表
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
