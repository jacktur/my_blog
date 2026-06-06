import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getArticleApi, deleteArticleApi, followUserApi, unfollowUserApi, checkFollowStatusApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ArrowLeft, UserPlus, UserCheck, Edit, Trash2, Loader2 } from 'lucide-react';
import CommentSection from '../components/CommentSection';
import ReadingProgressBar from '../components/ReadingProgressBar';
import TableOfContents from '../components/TableOfContents';
import BookmarkButton from '../components/BookmarkButton';
import EnhancedCodeBlock from '../components/EnhancedCodeBlock';
import { splitHtmlAtCodeBlocks } from '../utils/codeBlockEnhancer';
import { getDisplayInitial, getDisplayName } from '../utils/displayName';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    getArticleApi(id)
      .then((res) => setArticle(res.data.article))
      .catch(() => setError('文章不存在'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user && article && user.id !== article.user_id) {
      checkFollowStatusApi(article.user_id)
        .then((res) => setFollowing(res.data.isFollowing))
        .catch(() => {});
    }
  }, [article, user]);

  const handleDelete = async () => {
    if (!window.confirm('确定删除这篇文章？')) return;
    setDeleting(true);
    try { await deleteArticleApi(id); navigate('/'); }
    catch { alert('删除失败'); }
    finally { setDeleting(false); }
  };

  const handleFollow = async () => {
    if (!user) return;
    setFollowLoading(true);
    try {
      if (following) { await unfollowUserApi(article.user_id); setFollowing(false); }
      else { await followUserApi(article.user_id); setFollowing(true); }
    } catch { alert('操作失败'); }
    finally { setFollowLoading(false); }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderMarkdown = (content) => {
    const processed = content.replace(/^(#{1,6})\s+(.+)$/gm, (match, level, text) => {
      const id = text.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/(^-|-$)/g, '');
      return `${level} <span id="${id}"></span>${text}`;
    });
    return processed;
  };

  const renderContent = (content) => {
    const rawHtml = marked.parse(content);
    const sanitized = DOMPurify.sanitize(rawHtml, { ADD_TAGS: ['span'], ADD_ATTR: ['id'] });
    const parts = splitHtmlAtCodeBlocks(sanitized);
    return parts.map((part, i) =>
      part.type === 'code'
        ? <EnhancedCodeBlock key={`code-${i}`} code={part.code} language={part.language} />
        : <div key={`html-${i}`} className="markdown-body" dangerouslySetInnerHTML={{ __html: part.content }} />
    );
  };

  const isOwner = user && article && user.id === article.user_id;

  // Loading
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 size={20} className="text-app-blue animate-spin" /></div>;
  }

  // Error
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-app-red text-sm">{error}</p>
        <Link to="/" className="text-app-blue hover:underline mt-4 inline-block">&larr; 返回首页</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <ReadingProgressBar articleId={id} />
      <TableOfContents contentRef={contentRef} />

      {/* Cover image */}
      {article.cover_image && (
        <div className="w-full h-64 md:h-80 overflow-hidden">
          <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-[680px] mx-auto px-4 py-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-6">
          <ArrowLeft size={14} /> 返回
        </Link>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-app-text mb-4 leading-tight tracking-tight">
          {article.title}
        </h1>

        {/* Author row */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-app-border">
          <Link to={`/profile/${article.user_id}`} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-app-bg flex items-center justify-center text-app-subtext text-xs font-bold">
              {getDisplayInitial(article)}
            </div>
            <div>
              <p className="text-sm font-semibold text-app-text">{getDisplayName(article)}</p>
              <p className="text-xs text-app-subtext">
                {formatDate(article.created_at)}
                {article.read_time > 0 && ` · ${article.read_time} min read`}
                {article.view_count > 0 && ` · ${article.view_count} 次阅读`}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            {user && !isOwner && (
              <button onClick={handleFollow} disabled={followLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${following
                    ? 'border border-app-border text-app-subtext hover:text-app-red'
                    : 'bg-app-blue text-white hover:bg-app-blue/90'
                  }`}
              >
                {following ? <><UserCheck size={13} />已关注</> : <><UserPlus size={13} />关注</>}
              </button>
            )}
            <BookmarkButton articleId={article.id} />
            {isOwner && (
              <>
                <Link to={`/edit/${article.id}`}
                  className="p-1.5 rounded-full hover:bg-app-bg text-app-subtext hover:text-app-blue transition-colors">
                  <Edit size={15} />
                </Link>
                <button onClick={handleDelete} disabled={deleting}
                  className="p-1.5 rounded-full hover:bg-red-50 text-app-subtext hover:text-app-red transition-colors">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag) => (
              <Link key={tag.id || tag.name} to={`/?tag=${encodeURIComponent(tag.name)}`}
                className="px-3 py-1 rounded-full bg-app-bg text-app-blue text-xs font-medium hover:bg-app-blue/10 transition-colors">
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        <article ref={contentRef}>
          {renderContent(renderMarkdown(article.content))}
        </article>

        {/* Comment Section */}
        <CommentSection articleId={article.id} />
      </div>
    </div>
  );
}
