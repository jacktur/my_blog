import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Bookmark, Eye, Repeat2 } from 'lucide-react';
import BookmarkButton from './BookmarkButton';

export default function ArticleCard({ article }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="card-hoverable p-4">
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-app-bg flex items-center justify-center text-app-subtext text-xs font-bold">
          {article.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-app-text truncate">{article.username}</p>
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
        <span className="flex items-center gap-1">
          <MessageSquare size={14} />
          {article.comment_count ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp size={14} />
          {article.like_count ?? 0}
        </span>
        <BookmarkButton articleId={article.id} />
      </div>
    </div>
  );
}
