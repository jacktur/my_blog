import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { advancedSearchArticlesApi, getArticlesApi, getTagsApi } from '../api';
import ArticleCard from '../components/ArticleCard';
import { ArrowLeft, Hash, Loader2, Search } from 'lucide-react';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const trimmedQuery = query.trim();
  const [tag, setTag] = useState('');
  const [author, setAuthor] = useState('');
  const [sort, setSort] = useState('new');
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [discoverTags, setDiscoverTags] = useState([]);
  const [discoverArticles, setDiscoverArticles] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  useEffect(() => {
    if (trimmedQuery) return;
    Promise.resolve()
      .then(() => {
        setDiscoverLoading(true);
        setError('');
        return Promise.all([
          getTagsApi(),
          getArticlesApi(null, { sort: 'hot', limit: 6 }),
        ]);
      })
      .then(([tagsRes, articlesRes]) => {
        setDiscoverTags(tagsRes.data.tags || []);
        setDiscoverArticles(articlesRes.data.articles || []);
      })
      .catch(() => setError('发现内容加载失败'))
      .finally(() => setDiscoverLoading(false));
  }, [trimmedQuery]);

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        if (!trimmedQuery) {
          setLoading(false);
          setArticles([]);
          setError('');
          return null;
        }
        setLoading(true);
        setError('');
        return advancedSearchArticlesApi({ q: trimmedQuery, tag: tag || undefined, author: author || undefined, sort: sort === 'hot' ? 'hot' : undefined, page: 1 });
      })
      .then((r) => {
        if (!r) return;
        setArticles(r.data.articles);
        setPage(1);
        setHasMore(!!r.data.pagination?.hasMore);
      })
      .catch(() => setError('搜索失败'))
      .finally(() => setLoading(false));
  }, [trimmedQuery, tag, author, sort]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const r = await advancedSearchArticlesApi({ q: trimmedQuery, tag: tag || undefined, author: author || undefined, sort: sort === 'hot' ? 'hot' : undefined, page: nextPage });
      setArticles(prev => [...prev, ...r.data.articles]);
      setPage(nextPage);
      setHasMore(!!r.data.pagination?.hasMore);
    } catch { setError('加载更多失败'); }
    finally { setLoading(false); }
  };

  const highlight = (text) => {
    if (!trimmedQuery || !text) return text;
    const parts = String(text).split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig'));
    return parts.map((part, i) => part.toLowerCase() === trimmedQuery.toLowerCase()
      ? <mark key={i} className="bg-app-yellow/30 text-app-text rounded px-0.5">{part}</mark>
      : part);
  };

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4">
        <ArrowLeft size={14} /> 返回
      </Link>
      <h1 className="text-lg font-bold text-app-text mb-2">{query ? '搜索结果' : '发现'}</h1>
      {query && <p className="text-app-subtext text-sm mb-4">关键词："{query}"</p>}
      {query ? <div className="grid sm:grid-cols-3 gap-2 mb-4">
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="按标签筛选" className="h-9 px-3 rounded-xl bg-white border border-app-border text-sm text-app-text outline-none" />
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="按作者筛选" className="h-9 px-3 rounded-xl bg-white border border-app-border text-sm text-app-text outline-none" />
        <select value={sort} onChange={e => setSort(e.target.value)} className="h-9 px-3 rounded-xl bg-white border border-app-border text-sm text-app-text outline-none">
          <option value="new">最新</option>
          <option value="hot">热度</option>
        </select>
      </div> : (
        <div className="space-y-4">
          {discoverLoading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
          {!discoverLoading && (
            <>
              <section className="rounded-2xl border border-app-border bg-white p-4 shadow-card">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-text">
                  <Hash size={15} className="text-app-blue" />
                  热门话题
                </h2>
                <div className="flex flex-wrap gap-2">
                  {discoverTags.slice(0, 18).map((item) => (
                    <Link
                      key={item.id}
                      to={`/?tag=${encodeURIComponent(item.name)}`}
                      className="rounded-lg bg-app-bg px-3 py-2 text-sm font-medium text-app-subtext transition-colors hover:bg-app-blue/10 hover:text-app-blue"
                    >
                      #{item.name} <span className="text-xs opacity-60">{item.article_count}</span>
                    </Link>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-text">
                  <Search size={15} className="text-app-orange" />
                  热门文章
                </h2>
                <div className="space-y-3">
                  {discoverArticles.map((item) => <ArticleCard key={item.id} article={item} compact />)}
                </div>
              </section>
            </>
          )}
        </div>
      )}
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {error && <div className="text-center py-12"><p className="text-app-red text-sm">{error}</p></div>}
      {!loading && query && articles.length === 0 && <div className="text-center py-16 bg-white rounded-xl shadow-card"><p className="text-app-subtext text-sm">未找到相关文章</p></div>}
      <div className="space-y-3">
        {articles.map(a => <ArticleCard key={a.id} article={{ ...a, title: highlight(a.title), excerpt: highlight(a.excerpt) }} />)}
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button onClick={loadMore} disabled={loading} className="px-4 py-2 rounded-xl bg-white border border-app-border text-sm text-app-text hover:bg-app-bg disabled:opacity-50">加载更多</button>
        </div>
      )}
    </div>
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
