import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardApi, dailyCheckinApi } from '../api';
import { FileText, ThumbsUp, MessageSquare, Eye, Users, UserPlus, Activity, BookOpen, Loader2, LayoutDashboard } from 'lucide-react';
import XPProgressBar from '../components/XPProgressBar';
import ActivityFeed from '../components/ActivityFeed';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streakMsg, setStreakMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getDashboardApi().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    dailyCheckinApi().then(r => {
      if (r.data.bonus > 0) setStreakMsg(`签到成功! +${r.data.bonus} XP`);
      else if (r.data.alreadyCheckedIn) setStreakMsg('今日已签到');
    }).catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) return <div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 size={20} className="text-app-blue animate-spin" /></div>;

  const { user, stats, recentActivity, readingHistory } = data || {};
  if (!user) return null;

  const getAvatarUrl = av => {
    if (!av) return '/uploads/avatars/defaults/default-1.svg';
    if (av.startsWith('custom/')) return `/uploads/avatars/${av}`;
    return `/uploads/avatars/defaults/${av}.svg`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <LayoutDashboard size={18} className="text-app-blue" />
        <h1 className="text-lg font-bold text-app-text">控制台</h1>
      </div>
      {streakMsg && <div className="mb-4 px-4 py-3 rounded-xl bg-app-blue/5 border border-app-blue/10"><p className="text-app-blue text-sm font-medium">{streakMsg}</p></div>}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-app-border">
            <img src={getAvatarUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2"><h2 className="text-base font-bold text-app-text">{user.nickname || user.username}</h2><span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-app-blue/10 text-app-blue">Lv.{user.level}</span></div>
            <p className="text-app-subtext text-xs">@{user.username} · {user.title}</p>
          </div>
          <div className="text-right"><p className="text-xl font-bold text-app-blue">{user.currentStreak}</p><p className="text-[10px] text-app-subtext">连续天数</p></div>
        </div>
        <div className="mt-3"><XPProgressBar xp={user.xp} level={user.level} nextLevelXp={user.nextLevelXp} currentLevelXp={user.currentLevelXp} levelProgress={user.levelProgress} title={user.title} /></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[{ icon: FileText, label: '文章', val: stats.articles, c: 'text-app-blue' },{ icon: ThumbsUp, label: '获赞', val: stats.likesReceived, c: 'text-app-red' },{ icon: MessageSquare, label: '评论', val: stats.comments, c: 'text-app-green' },{ icon: Eye, label: '浏览', val: stats.views, c: 'text-app-purple' },{ icon: Users, label: '粉丝', val: stats.followers, c: 'text-app-orange' },{ icon: UserPlus, label: '关注', val: stats.following, c: 'text-app-blue' }].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 text-center shadow-card">
            <s.icon size={16} className={`mx-auto mb-1 ${s.c}`} /><p className="text-base font-bold text-app-text">{s.val}</p><p className="text-[10px] text-app-subtext">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Activity & Reading */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-text mb-3"><Activity size={14} className="text-app-blue" />最近动态</h3>
          <ActivityFeed activities={recentActivity} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-text mb-3"><BookOpen size={14} className="text-app-purple" />阅读记录</h3>
          {!readingHistory?.length ? <p className="text-app-subtext text-xs">暂无记录</p> :
            readingHistory.map(item => (
              <Link key={item.article_id} to={`/article/${item.article_id}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-app-bg transition-colors group">
                <span className="text-xs text-app-text truncate group-hover:text-app-blue">{item.title}</span>
                <span className="text-[10px] text-app-subtext ml-2 shrink-0">{Math.round(item.scroll_percentage || 0)}%</span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
