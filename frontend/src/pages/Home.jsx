import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getArticlesApi, getTagsApi, getFollowingArticlesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ArticleCard from '../components/ArticleCard';
import PublisherBox from '../components/PublisherBox';
import { Clock, Eye, Hash, LayoutList, Loader2, Rows3, Sparkles, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || '';
  const urlTab = searchParams.get('tab');
  const [tab, setTab] = useState(['recommend', 'following', 'hot'].includes(urlTab) ? urlTab : 'recommend');
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [density, setDensity] = useState(() => localStorage.getItem('feed-density') || 'comfortable');

  useEffect(() => {
    setLoading(true);
    setError('');
    const fetchFn = tab === 'following' && isAuthenticated
      ? () => getFollowingArticlesApi({ page: 1 })
      : () => getArticlesApi(activeTag || undefined, { ...(tab === 'hot' ? { sort: 'hot' } : {}), page: 1 });

    fetchFn()
      .then((res) => { setArticles(res.data.articles); setPage(1); setHasMore(!!res.data.pagination?.hasMore); })
      .catch(() => setError('无法加载文章'))
      .finally(() => setLoading(false));
  }, [activeTag, tab, isAuthenticated]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (['recommend', 'following', 'hot'].includes(nextTab) && nextTab !== tab) setTab(nextTab);
  }, [searchParams, tab]);

  useEffect(() => {
    getTagsApi()
      .then((res) => setTags(res.data.tags))
      .catch(() => {});
  }, []);

  const clearTag = () => setSearchParams(tab === 'recommend' ? {} : { tab });
  const switchTab = (nextTab) => {
    setTab(nextTab);
    const params = {};
    if (nextTab !== 'recommend') params.tab = nextTab;
    if (activeTag) params.tag = activeTag;
    setSearchParams(params);
  };

  const switchDensity = (nextDensity) => {
    setDensity(nextDensity);
    localStorage.setItem('feed-density', nextDensity);
  };

  const showFeatured = !loading && !error && articles.length > 0 && tab !== 'following' && !activeTag;
  const featuredArticle = showFeatured ? articles[0] : null;
  const listArticles = showFeatured ? articles.slice(1) : articles;
  const totalReadTime = articles.reduce((sum, item) => sum + (item.read_time || 0), 0);
  const totalViews = articles.reduce((sum, item) => sum + (item.view_count || 0), 0);
  const totalHeat = articles.reduce(
    (sum, item) => sum + ((item.like_count || 0) * 3 + (item.comment_count || 0) * 2 + (item.view_count || 0)),
    0
  );

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = tab === 'following' && isAuthenticated
        ? await getFollowingArticlesApi({ page: nextPage })
        : await getArticlesApi(activeTag || undefined, { ...(tab === 'hot' ? { sort: 'hot' } : {}), page: nextPage });
      setArticles(prev => [...prev, ...res.data.articles]);
      setPage(nextPage);
      setHasMore(!!res.data.pagination?.hasMore);
    } catch { setError('无法加载文章'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* Publisher Box */}
      <PublisherBox />

      <section className="mb-3 rounded-xl border border-app-border bg-app-card p-3 shadow-card">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-app-bg p-1">
          {[
            { key: 'recommend', label: '推荐', icon: TrendingUp },
            { key: 'following', label: '关注', icon: Users },
            { key: 'hot', label: '热门', icon: Hash },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              disabled={t.key === 'following' && !isAuthenticated}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all
                ${tab === t.key
                  ? 'bg-app-card text-app-blue shadow-sm'
                  : 'text-app-subtext hover:text-app-text'
                } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-app-text">
              <Sparkles size={15} className="text-app-orange" />
              <span>{activeTag ? `正在浏览 #${activeTag}` : tab === 'hot' ? '正在浏览热门内容' : tab === 'following' ? '来自关注作者的更新' : '为你整理的最新动态'}</span>
            </div>
            {!error && articles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-app-subtext">
                <span className="inline-flex items-center gap-1"><LayoutList size={13} />{articles.length} 篇</span>
                <span className="inline-flex items-center gap-1"><Clock size={13} />约 {totalReadTime || articles.length} 分钟</span>
                <span className="inline-flex items-center gap-1"><Eye size={13} />{totalViews} 浏览</span>
                <span className="inline-flex items-center gap-1 text-app-orange"><TrendingUp size={13} />{totalHeat} 热度</span>
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 rounded-lg bg-app-bg p-1 sm:w-36">
            <button
              type="button"
              onClick={() => switchDensity('comfortable')}
              className={`flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${density === 'comfortable' ? 'bg-app-card text-app-blue shadow-sm' : 'text-app-subtext hover:text-app-text'}`}
              title="舒适视图"
            >
              <Rows3 size={15} />
            </button>
            <button
              type="button"
              onClick={() => switchDensity('compact')}
              className={`flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${density === 'compact' ? 'bg-app-card text-app-blue shadow-sm' : 'text-app-subtext hover:text-app-text'}`}
              title="紧凑视图"
            >
              <LayoutList size={15} />
            </button>
          </div>
        </div>

        {activeTag ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-app-blue/5 px-3 py-2">
            <Hash size={14} className="text-app-blue" />
            <span className="text-sm font-medium text-app-blue">#{activeTag}</span>
            <button onClick={clearTag} className="ml-auto text-xs text-app-subtext transition-colors hover:text-app-blue">
              清除
            </button>
          </div>
        ) : tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-app-border pt-3">
            {tags.slice(0, 8).map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSearchParams({ tag: tag.name })}
                className="rounded-lg bg-app-bg px-2.5 py-1.5 text-xs font-medium text-app-subtext transition-colors hover:bg-app-blue/10 hover:text-app-blue"
              >
                #{tag.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-app-blue animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <p className="text-app-red text-sm">加载失败，请稍后重试</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && articles.length === 0 && (
        <div className="rounded-xl border border-app-border bg-app-card py-16 text-center shadow-card">
          <p className="text-app-subtext text-sm">{activeTag ? '该标签下暂无文章' : '暂无文章'}</p>
        </div>
      )}

      {/* Article Feed */}
      <div className="space-y-3">
        {featuredArticle && (
          <ArticleCard article={featuredArticle} featured />
        )}
        {listArticles.map((article) => (
          <ArticleCard key={article.id} article={article} compact={density === 'compact'} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button onClick={loadMore} disabled={loading} className="rounded-lg border border-app-border bg-app-card px-4 py-2 text-sm text-app-text transition-colors hover:bg-app-bg disabled:opacity-50">加载更多</button>
        </div>
      )}
    </div>
  );
}
