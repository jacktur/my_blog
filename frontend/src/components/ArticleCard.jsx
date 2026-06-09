import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Bookmark, Eye, Repeat2 } from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import { useAuth } from '../context/AuthContext';
import { likeArticleApi } from '../api';
import { useXpNotification } from './XPNotification';
import { getAvatarUrl, getDisplayName } from '../utils/displayName';
import { useState } from 'react';

export default function ArticleCard({ article }) {
  const { user } = useAuth();
  const { notifyGamification } = useXpNotification();
  const [likeCount, setLikeCount] = useState(article.like_count ?? 0);
  const [liking, setLiking] = useState(false);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleLike = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      const res = await likeArticleApi(article.id);
      setLikeCount(res.data.likes);
      notifyGamification(res.data.gamification?.self);
    } catch (err) {
      alert(err.response?.data?.error || '点赞失败');
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="card-hoverable p-4">
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-app-bg ring-1 ring-app-border">
          <img
            src={getAvatarUrl(article)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/uploads/avatars/defaults/default-1.svg'; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-app-text truncate">{getDisplayName(article)}</p>
          <p className="text-xs text-app-subtext">{formatDate(article.created_at)}</p>
        </div>
        {article.read_time > 0 && (
          <span className="text-xs text-app-subtext">{article.read_time} min read</span>
        )}
      </div>

      {/* Content */}
      <Link to={`/article/${article.id}`} className="block group">
        {/* Cover image */}
        {article.cover_image && (
          <div className="rounded-xl overflow-hidden mb-3">
            <img
              src={article.cover_image}
              alt=""
              className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        )}

        <h3 className="text-base font-semibold text-app-text mb-1.5 group-hover:text-app-blue transition-colors line-clamp-2">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-sm text-app-subtext line-clamp-2 mb-3 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.map((tag) => (
              <span
                key={tag.id || tag.name}
                className="px-2 py-0.5 rounded-full bg-app-blue/8 text-app-blue text-xs font-medium"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Interaction Bar — repost / comment / like / bookmark */}
      <div className="flex items-center gap-6 text-xs text-app-subtext pt-2 border-t border-app-border">
        <span className="flex items-center gap-1 cursor-pointer hover:text-app-blue transition-colors">
          <Repeat2 size={14} />
          转发
        </span>
        <Link
          to={`/article/${article.id}#comments`}
          className="flex items-center gap-1 cursor-pointer hover:text-app-blue transition-colors"
        >
          <MessageSquare size={14} />
          {article.comment_count ?? 0}
        </Link>
        <button
          type="button"
          onClick={handleLike}
          disabled={liking}
          className="flex items-center gap-1 cursor-pointer hover:text-app-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ThumbsUp size={14} />
          {likeCount}
        </button>
        <BookmarkButton articleId={article.id} />
      </div>
    </div>
  );
}
