import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookmarksApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ArticleCard from '../components/ArticleCard';
import { Bookmark, ArrowLeft, Loader2 } from 'lucide-react';

export default function ReadingListPage() {
  const { isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isAuthenticated) return; getBookmarksApi().then(r => setBookmarks(r.data.bookmarks)).catch(() => {}).finally(() => setLoading(false)); }, [isAuthenticated]);

  if (!isAuthenticated) return <div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4"><ArrowLeft size={14} /> 返回</Link>
      <div className="flex items-center gap-2 mb-4"><Bookmark size={20} className="text-app-orange" /><h1 className="text-lg font-bold text-app-text">收藏列表</h1></div>
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {!loading && bookmarks.length === 0 && <div className="text-center py-16 bg-white rounded-2xl shadow-card"><Bookmark size={32} className="mx-auto mb-2 opacity-20" /><p className="text-app-subtext text-sm">收藏列表为空</p></div>}
      <div className="space-y-3">{bookmarks.map(a => <ArticleCard key={a.id} article={a} />)}</div>
    </div>
  );
}
