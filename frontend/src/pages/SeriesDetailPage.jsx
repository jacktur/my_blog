import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getSeriesDetailApi } from '../api';
import ArticleCard from '../components/ArticleCard';

export default function SeriesDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSeriesDetailApi(id).then(res => setData(res.data)).catch(() => setError('系列不存在')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={20} className="text-app-blue animate-spin" /></div>;
  if (error) return <div className="max-w-lg mx-auto px-4 py-20 text-center text-app-red text-sm">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Link to="/series" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue text-sm mb-4"><ArrowLeft size={14} />返回系列</Link>
      <div className="bg-white rounded-2xl p-5 shadow-card mb-4">
        <h1 className="text-xl font-bold text-app-text">{data.series.title}</h1>
        {data.series.description && <p className="mt-2 text-sm text-app-subtext">{data.series.description}</p>}
        <p className="mt-3 text-xs text-app-subtext">{data.series.nickname || data.series.username} · {data.articles.length} 篇文章</p>
      </div>
      <div className="space-y-3">{data.articles.map(article => <ArticleCard key={article.id} article={article} />)}</div>
    </div>
  );
}
