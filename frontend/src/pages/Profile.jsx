import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserProfileApi, getUserArticlesApi, getUserStatsApi } from '../api';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Settings, FileText, ThumbsUp, MessageSquare, MapPin } from 'lucide-react';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getUserProfileApi(id), getUserArticlesApi(id), getUserStatsApi(id)])
      .then(([p, a, s]) => { setProfile(p.data.user); setArticles(a.data.articles); setStats(s.data.stats); })
      .catch(() => setError('用户不存在'))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = currentUser && profile && currentUser.id === profile.id;

  const getAvatarUrl = (av) => {
    if (!av) return '/uploads/avatars/defaults/default-1.svg';
    if (av.startsWith('custom/')) return `/uploads/avatars/${av}`;
    return `/uploads/avatars/defaults/${av}.svg`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (loading) return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">{error}</p><Link to="/" className="text-app-blue hover:underline mt-4 inline-block">&larr; 返回</Link></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-6">
        <ArrowLeft size={14} /> 返回
      </Link>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 shadow-card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-app-border">
            <img src={getAvatarUrl(profile.avatar)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-app-text">{profile.nickname || profile.username}</h1>
              {isOwner && (
                <Link to="/settings" className="p-1.5 rounded-full hover:bg-app-bg text-app-subtext hover:text-app-blue transition-colors">
                  <Settings size={15} />
                </Link>
              )}
              {!isOwner && (
                <button
                  onClick={() => navigate(`/chat?userId=${profile.id}`)}
                  className="h-8 px-4 rounded-lg border border-gray-300 text-sm text-gray-700
                    hover:bg-gray-50 transition-colors font-medium"
                >
                  私信
                </button>
              )}
            </div>
            <p className="text-app-subtext text-sm">@{profile.username}</p>
            {profile.bio && <p className="text-app-text text-sm mt-2 italic">"{profile.bio}"</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-app-subtext">
              {profile.email && <span>{profile.email}</span>}
              {profile.birthday && <span><MapPin size={10} className="inline" /> {formatDate(profile.birthday)}</span>}
              <span>加入于 {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[{ icon: FileText, label: '文章', val: stats.articleCount, color: 'text-app-blue' },
            { icon: ThumbsUp, label: '获赞', val: stats.totalLikes, color: 'text-app-red' },
            { icon: MessageSquare, label: '评论', val: stats.totalComments, color: 'text-app-green' }].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-card">
              <s.icon size={18} className={`mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-app-text">{s.val}</p>
              <p className="text-xs text-app-subtext">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Articles */}
      <h2 className="text-base font-semibold text-app-text mb-3">文章 ({articles.length})</h2>
      {articles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-card"><p className="text-app-subtext text-sm">暂无文章</p></div>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
