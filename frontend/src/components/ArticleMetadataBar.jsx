import { Clock, BookOpen, Eye } from 'lucide-react';

export default function ArticleMetadataBar({ article }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-app-subtext font-medium">
      {article.read_time > 0 && (
        <span className="flex items-center gap-1">
          <BookOpen size={12} /> {article.read_time} min read
        </span>
      )}
      {article.view_count !== undefined && (
        <span className="flex items-center gap-1">
          <Eye size={12} /> {article.view_count} views
        </span>
      )}
      {article.created_at && (
        <span className="flex items-center gap-1">
          <Clock size={12} /> {formatDate(article.created_at)}
        </span>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
