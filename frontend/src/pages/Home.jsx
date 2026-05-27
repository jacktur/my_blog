import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getArticlesApi, getTagsApi, getFollowingArticlesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ArticleCard from '../components/ArticleCard';
import PublisherBox from '../components/PublisherBox';
import { Hash, TrendingUp, Users, Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || '';
  const [tab, setTab] = useState('recommend');
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const fetchFn = tab === 'following' && isAuthenticated
      ? getFollowingArticlesApi
      : () => getArticlesApi(activeTag || undefined);

    fetchFn()
      .then((res) => setArticles(res.data.articles))
      .catch(() => setError('无法加载文章'))
      .finally(() => setLoading(false));
  }, [activeTag, tab, isAuthenticated]);

  useEffect(() => {
    getTagsApi()
      .then((res) => setTags(res.data.tags))
      .catch(() => {});
  }, []);

  const clearTag = () => setSearchParams({});

  return (
    <div>
      {/* Publisher Box */}
      <PublisherBox />

      {/* Tab Bar — Weibo style */}
      <div className="flex items-center gap-0 mb-3 bg-white rounded-xl p-1 shadow-card">
        {[
          { key: 'recommend', label: '推荐', icon: TrendingUp },
          { key: 'following', label: '关注', icon: Users },
          { key: 'hot', label: '热门', icon: Hash },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={t.key === 'following' && !isAuthenticated}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key
                ? 'bg-app-blue text-white shadow-sm'
                : 'text-app-subtext hover:text-app-text hover:bg-app-bg'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tag filter */}
      {activeTag && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-xl bg-app-blue/5 border border-app-blue/10">
          <Hash size={14} className="text-app-blue" />
          <span className="text-app-blue text-sm font-medium">#{activeTag}</span>
          <button onClick={clearTag} className="ml-auto text-app-subtext hover:text-app-blue text-xs transition-colors">
            清除
          </button>
        </div>
      )}

      {/* Tag quick filters */}
      {tags.length > 0 && !activeTag && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.slice(0, 8).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSearchParams({ tag: tag.name })}
              className="px-3 py-1 rounded-full bg-white text-app-subtext text-xs font-medium hover:bg-app-blue/10 hover:text-app-blue transition-colors shadow-sm"
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

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
        <div className="text-center py-16 bg-white rounded-xl shadow-card">
          <p className="text-app-subtext text-sm">{activeTag ? '该标签下暂无文章' : '暂无文章'}</p>
        </div>
      )}

      {/* Article Feed */}
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
