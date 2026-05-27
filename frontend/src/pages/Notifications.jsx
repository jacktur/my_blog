import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Megaphone, CheckCheck, Loader2 } from 'lucide-react';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../api';
import { useAuth } from '../context/AuthContext';

const typeIcons = { like: Heart, comment: MessageCircle, system: Megaphone };
const typeColors = { like: 'text-app-red', comment: 'text-app-blue', system: 'text-app-orange' };
const typeLabels = { like: '赞', comment: '评论', system: '系统' };

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const params = { page: pageNum }; if (filter === 'unread') params.type = 'unread';
      const res = await getNotificationsApi(params);
      setNotifications(res.data.notifications);
      setPage(pageNum); setTotalPages(res.data.pagination.totalPages);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchNotifications(1); }, [fetchNotifications]);

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-app-text">消息中心</h1>
        <button onClick={async () => { await markAllNotificationsReadApi(); setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 }))); }}
          className="text-xs text-app-blue hover:text-app-blue/80 transition-colors flex items-center gap-1">
          <CheckCheck size={13} /> 全部已读
        </button>
      </div>
      <div className="flex gap-1 mb-4 p-1 bg-app-bg rounded-xl w-fit">
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => { setFilter(f); fetchNotifications(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-white text-app-text shadow-sm' : 'text-app-subtext hover:text-app-text'}`}>
            {f === 'all' ? '全部' : '未读'}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>
        : notifications.length === 0 ? <div className="text-center py-16 text-app-subtext"><Bell size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">暂无消息</p></div>
        : <div className="space-y-2">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell; const color = typeColors[n.type] || 'text-app-subtext';
            return (
              <Link key={n.id} to={n.article_id ? `/article/${n.article_id}` : '#'} onClick={async () => { if (!n.is_read) { await markNotificationReadApi(n.id); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x)); } }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.is_read ? 'bg-white border-app-border' : 'bg-app-blue/5 border-app-blue/10'}`}>
                <div className={`${color} mt-0.5`}><Icon size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] text-app-subtext uppercase">{typeLabels[n.type]}</span>{!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-app-blue" />}</div>
                  <p className="text-xs text-app-text">{n.message}</p>
                  {n.comment_preview && <p className="text-[10px] text-app-subtext mt-0.5 italic">「{n.comment_preview}」</p>}
                  <p className="text-[10px] text-app-subtext mt-1">{formatTime(n.created_at)}</p>
                </div>
              </Link>
            );
          })}
        </div>}
    </div>
  );
}

function formatTime(d) { const date = new Date(d + 'Z'); const diff = Date.now() - date; const m = Math.floor(diff / 60000); if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`; const h = Math.floor(m / 60); if (h < 24) return `${h}小时前`; if (h < 48) return '昨天'; return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); }
