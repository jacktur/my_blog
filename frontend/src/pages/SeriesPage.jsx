import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { getSeriesApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SeriesPage() {
  const { isAuthenticated } = useAuth();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeriesApi().then(res => setSeries(res.data.series || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><BookOpen size={20} className="text-app-blue" /><h1 className="text-lg font-bold text-app-text">系列文章</h1></div>
        {isAuthenticated && <Link to="/series/manage" className="inline-flex items-center gap-1 text-xs text-app-blue"><Plus size={13} />管理系列</Link>}
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div> :
        series.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center text-sm text-app-subtext shadow-card">暂无系列</div> :
        <div className="space-y-3">{series.map(item => (
          <Link key={item.id} to={`/series/${item.id}`} className="block bg-white rounded-2xl p-4 shadow-card border border-app-border hover:border-app-blue/30">
            <h2 className="text-base font-semibold text-app-text">{item.title}</h2>
            {item.description && <p className="mt-1 text-sm text-app-subtext line-clamp-2">{item.description}</p>}
            <p className="mt-2 text-xs text-app-subtext">{item.nickname || item.username} · {item.article_count} 篇文章</p>
          </Link>
        ))}</div>}
    </div>
  );
}
