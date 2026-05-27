import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Megaphone, Mail, CheckCheck } from 'lucide-react';
import { getUnreadCountApi, getNotificationsApi, markAllNotificationsReadApi, getConversationsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const typeIcons = { like: Heart, comment: MessageCircle, system: Megaphone };
const typeColors = { like: 'text-app-red', comment: 'text-app-blue', system: 'text-app-orange' };

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [unreadRes, notifRes, msgRes] = await Promise.all([
        getUnreadCountApi(),
        getNotificationsApi({ type: 'unread', page: 1 }),
        getConversationsApi({ scope: 'recent', limit: 2 })
      ]);
      setTotalUnread(unreadRes.data.totalUnread);
      setNotifications(notifRes.data.notifications);
      setRecentMessages(msgRes.data.conversations || []);
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = async () => {
    if (!open) await fetchAll();
    setOpen(!open);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setTotalUnread(prev => Math.max(0, prev - notifications.filter(n => !n.is_read).length));
      setNotifications([]);
    } catch {}
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative flex items-center text-app-subtext hover:text-app-blue transition-colors"
        title="消息"
      >
        <Bell size={18} />
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-app-red text-white text-[10px] font-bold px-1">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-lg border border-app-border overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
            <h3 className="text-sm font-semibold text-app-text">消息</h3>
            {totalUnread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-app-blue hover:text-app-blue/80 flex items-center gap-1">
                <CheckCheck size={13} />全部已读
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {/* 最近私信 */}
            {recentMessages.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[10px] text-app-subtext uppercase tracking-wider font-semibold">
                  私信
                </div>
                {recentMessages.map((msg) => (
                  <Link
                    key={`msg-${msg.id}`}
                    to="/chat"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors border-b border-app-border last:border-0"
                  >
                    <div className="text-blue-500 mt-0.5">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-app-text">
                        <span className="font-medium">{msg.other_nickname || msg.other_username}</span>：{msg.last_message}
                      </p>
                      <p className="text-[10px] text-app-subtext mt-0.5">{formatTime(msg.last_message_at)}</p>
                    </div>
                    {msg.unread_count > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold px-1 mt-1">
                        {msg.unread_count > 99 ? '99+' : msg.unread_count}
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}
            {/* 通知 */}
            <div className="px-4 py-1.5 text-[10px] text-app-subtext uppercase tracking-wider font-semibold">
              通知
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-app-subtext">
                <Bell size={24} className="mb-1 opacity-20" />
                <p className="text-xs">暂无新消息</p>
              </div>
            ) : (
              notifications.slice(0, 3).map(n => {
                const Icon = typeIcons[n.type] || Bell;
                const color = typeColors[n.type] || 'text-app-subtext';
                return (
                  <Link
                    key={n.id}
                    to={n.article_id ? `/article/${n.article_id}` : '#'}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-app-bg transition-colors border-b border-app-border last:border-0"
                  >
                    <div className={`${color} mt-0.5`}><Icon size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-app-text">{n.message}</p>
                      {n.comment_preview && (
                        <p className="text-[10px] text-app-subtext mt-0.5 truncate">「{n.comment_preview}」</p>
                      )}
                      <p className="text-[10px] text-app-subtext mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-app-blue mt-2 shrink-0" />}
                  </Link>
                );
              })
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-app-blue py-3 hover:bg-app-bg transition-colors border-t border-app-border"
          >
            查看全部消息
          </Link>
        </div>
      )}
    </div>
  );
}

function formatTime(d) {
  if (!d) return '';
  const date = new Date(d + 'Z');
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  if (h < 48) return '昨天';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
