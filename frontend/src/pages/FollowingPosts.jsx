import { useEffect, useState } from 'react';
import { getFollowingArticlesApi } from '../api';
import ArticleCard from '../components/ArticleCard';
import { Loader2 } from 'lucide-react';

export default function FollowingPosts() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFollowingArticlesApi().then(r => setArticles(r.data.articles)).catch(() => setError('加载失败')).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-lg font-bold text-app-text mb-4">关注动态</h1>
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {error && <div className="text-center py-12"><p className="text-app-red text-sm">{error}</p></div>}
      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-card"><p className="text-app-subtext text-sm">暂无关注动态</p></div>
      )}
      <div className="space-y-3">
        {articles.map(a => <ArticleCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}
