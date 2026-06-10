import { Link } from 'react-router-dom';
import { Clock, Eye, Flame, MessageSquare, Repeat2, ThumbsUp } from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import { useAuth } from '../context/AuthContext';
import { likeArticleApi } from '../api';
import { useXpNotification } from './XPNotification';
import { getAvatarUrl, getDisplayName } from '../utils/displayName';
import { useState } from 'react';

export default function ArticleCard({ article, featured = false, compact = false }) {
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

  const readTime = article.read_time || 0;
  const viewCount = article.view_count || 0;
  const commentCount = article.comment_count || 0;
  const heat = likeCount * 3 + commentCount * 2 + viewCount;
  const coverHeight = featured ? 'h-64 sm:h-72' : compact ? 'h-28 sm:h-32' : 'h-44';

  return (
    <article className={`card-hoverable border border-app-border ${featured ? 'p-0 overflow-hidden' : compact ? 'p-3' : 'p-4'}`}>
      {featured && (
        <div className="px-4 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-app-orange/10 px-2.5 py-1.5 text-xs font-semibold text-app-orange">
              <Flame size={13} />
              今日精选
            </div>
            <div className="flex items-center gap-2 text-xs text-app-subtext">
              <Eye size={13} />
              {viewCount}
            </div>
          </div>
        </div>
      )}

      <div className={featured ? 'px-4 pb-4' : ''}>
      {/* Author row */}
      <div className={`flex select-none items-center gap-2.5 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="h-8 w-8 overflow-hidden rounded-lg bg-app-bg ring-1 ring-app-border">
          <Link to={`/profile/${article.user_id}`} className="block h-full w-full">
            <img
              src={getAvatarUrl(article)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = '/uploads/avatars/defaults/default-1.svg'; }}
            />
          </Link>
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${article.user_id}`} className="block truncate text-sm font-medium text-app-text transition-colors hover:text-app-blue">
            {getDisplayName(article)}
          </Link>
          <p className="text-xs text-app-subtext">{formatDate(article.created_at)}</p>
        </div>
        {readTime > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-app-bg px-2 py-1 text-xs text-app-subtext">
            <Clock size={12} />
            {readTime} 分钟
          </span>
        )}
      </div>

      {/* Content */}
      <Link to={`/article/${article.id}`} className={`block cursor-pointer group ${compact && article.cover_image ? 'sm:grid sm:grid-cols-[1fr_9rem] sm:gap-3' : ''}`}>
        {/* Cover image */}
        {article.cover_image && (
          <div className={`overflow-hidden rounded-lg bg-app-bg ${compact ? 'mb-2 sm:order-2 sm:mb-0' : 'mb-3'}`}>
            <img
              src={article.cover_image}
              alt=""
              className={`w-full ${coverHeight} object-cover transition-transform duration-300 group-hover:scale-[1.02]`}
            />
          </div>
        )}

        <div className={compact && article.cover_image ? 'sm:order-1' : ''}>
          <h3 className={`${featured ? 'text-xl sm:text-2xl' : 'text-base'} mb-1.5 line-clamp-2 font-semibold leading-snug text-app-text transition-colors group-hover:text-app-blue`}>
            {article.title}
          </h3>

          {article.excerpt && (
            <p className={`text-sm text-app-subtext ${compact ? 'line-clamp-1' : featured ? 'line-clamp-3' : 'line-clamp-2'} mb-3 leading-6`}>
              {article.excerpt}
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-3 flex cursor-default select-none flex-wrap gap-1.5">
              {article.tags.slice(0, featured ? 5 : 3).map((tag) => (
                <span
                  key={tag.id || tag.name}
                  className="rounded-md bg-app-blue/8 px-2 py-1 text-xs font-medium text-app-blue"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Interaction Bar — repost / comment / like / bookmark */}
      <div className={`flex select-none items-center border-t border-app-border pt-2 text-xs text-app-subtext ${compact ? 'gap-3 sm:gap-4' : 'gap-4 sm:gap-6'}`}>
        <span className="flex cursor-default items-center gap-1">
          <Eye size={14} />
          {viewCount}
        </span>
        {heat > 0 && (
          <span className="hidden cursor-default items-center gap-1 text-app-orange sm:flex">
            <Flame size={14} />
            {heat}
          </span>
        )}
        <span className="flex cursor-default items-center gap-1 transition-colors">
          <Repeat2 size={14} />
          转发
        </span>
        <Link
          to={`/article/${article.id}#comments`}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-app-bg hover:text-app-blue"
        >
          <MessageSquare size={14} />
          {article.comment_count ?? 0}
        </Link>
        <button
          type="button"
          onClick={handleLike}
          disabled={liking}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-app-bg hover:text-app-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp size={14} />
          {likeCount}
        </button>
        <BookmarkButton articleId={article.id} />
      </div>
      </div>
    </article>
  );
}
