import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchArticlesApi } from '../api';
import ArticleCard from '../components/ArticleCard';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) { setLoading(false); setArticles([]); return; }
    setLoading(true);
    searchArticlesApi(query.trim()).then(r => setArticles(r.data.articles)).catch(() => setError('搜索失败')).finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4">
        <ArrowLeft size={14} /> 返回
      </Link>
      <h1 className="text-lg font-bold text-app-text mb-2">搜索结果</h1>
      {query && <p className="text-app-subtext text-sm mb-4">关键词："{query}"</p>}
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {error && <div className="text-center py-12"><p className="text-app-red text-sm">{error}</p></div>}
      {!loading && !query && <div className="text-center py-16 bg-white rounded-xl shadow-card"><p className="text-app-subtext text-sm">请输入关键词搜索</p></div>}
      {!loading && query && articles.length === 0 && <div className="text-center py-16 bg-white rounded-xl shadow-card"><p className="text-app-subtext text-sm">未找到相关文章</p></div>}
      <div className="space-y-3">{articles.map(a => <ArticleCard key={a.id} article={a} />)}</div>
    </div>
  );
}
