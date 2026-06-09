import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FileText,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Shield,
  Trash2,
  UserX,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  deleteAdminArticleApi,
  deleteAdminCommentApi,
  deleteAdminMessageApi,
  getAdminArticlesApi,
  getAdminCommentsApi,
  getAdminMessagesApi,
  getAdminSummaryApi,
  getAdminUsersApi,
  updateAdminUserStatusApi,
} from '../api';
import { getDisplayName } from '../utils/displayName';

const TABS = [
  { key: 'users', label: '用户', icon: Users },
  { key: 'articles', label: '文章', icon: FileText },
  { key: 'comments', label: '评论', icon: MessageCircle },
  { key: 'messages', label: '私信', icon: MessagesSquare },
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function snippet(text, len = 90) {
  if (!text) return '';
  return text.length > len ? `${text.slice(0, len)}...` : text;
}

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);

  const isAdmin = isAuthenticated && user?.role === 'admin';

  const statCards = useMemo(() => [
    { label: '注册用户', value: summary?.users ?? 0, icon: Users, color: 'text-app-blue' },
    { label: '文章', value: summary?.articles ?? 0, icon: FileText, color: 'text-app-green' },
    { label: '评论', value: summary?.comments ?? 0, icon: MessageCircle, color: 'text-app-orange' },
    { label: '私信', value: summary?.messages ?? 0, icon: MessagesSquare, color: 'text-app-purple' },
    { label: '封禁用户', value: summary?.bannedUsers ?? 0, icon: UserX, color: 'text-app-red' },
    { label: '今日新文章', value: summary?.todayArticles ?? 0, icon: Shield, color: 'text-app-blue' },
  ], [summary]);

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [summaryRes, usersRes, articlesRes, commentsRes, messagesRes] = await Promise.all([
        getAdminSummaryApi(),
        getAdminUsersApi(),
        getAdminArticlesApi(),
        getAdminCommentsApi(),
        getAdminMessagesApi(),
      ]);
      setSummary(summaryRes.data.summary);
      setUsers(usersRes.data.users);
      setArticles(articlesRes.data.articles);
      setComments(commentsRes.data.comments);
      setMessages(messagesRes.data.messages);
    } catch (err) {
      setError(err.response?.data?.error || '管理后台加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  const runAction = async (key, action, successText) => {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successText);
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setBusyKey('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-app-red text-sm">请先登录</p>
        <Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle size={22} className="mx-auto text-app-orange mb-3" />
        <p className="text-app-text text-sm font-medium">需要站长权限</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield size={19} className="text-app-blue" />
          <h1 className="text-lg font-bold text-app-text">内容审核</h1>
        </div>
        <span className="text-xs text-app-subtext">站长：{getDisplayName(user)}</span>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-app-red">{error}</div>}
      {notice && <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-app-green">{notice}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={20} className="text-app-blue animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-3 shadow-card">
                <card.icon size={15} className={card.color} />
                <p className="mt-2 text-lg font-bold text-app-text">{card.value}</p>
                <p className="text-[11px] text-app-subtext">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-sm border transition-colors shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-app-blue text-white border-app-blue'
                    : 'bg-white text-app-text border-app-border hover:border-app-blue/40'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              {users.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4 border-b border-app-border last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-app-text truncate">{item.nickname || item.username}</p>
                    <p className="text-xs text-app-subtext truncate">@{item.username} · {item.role} · {formatDate(item.created_at)}</p>
                    <p className="mt-1 text-[11px] text-app-subtext">文章 {item.article_count} · 评论 {item.comment_count} · 私信 {item.message_count}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg ${item.status === 'banned' ? 'bg-red-50 text-app-red' : 'bg-green-50 text-app-green'}`}>
                    {item.status === 'banned' ? '已封禁' : '正常'}
                  </span>
                  <button
                    disabled={busyKey === `user-${item.id}` || item.id === user.id || item.role === 'admin'}
                    onClick={() => runAction(
                      `user-${item.id}`,
                      () => updateAdminUserStatusApi(item.id, item.status === 'banned' ? 'active' : 'banned'),
                      item.status === 'banned' ? '用户已解封' : '用户已封禁'
                    )}
                    className="h-8 px-3 rounded-lg text-xs text-white bg-app-red disabled:bg-app-border disabled:text-app-subtext"
                  >
                    {item.status === 'banned' ? '解封' : '封禁'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'articles' && (
            <ContentList
              items={articles}
              renderTitle={(item) => item.title}
              renderMeta={(item) => `@${item.nickname || item.username} · ${formatDate(item.created_at)} · 评论 ${item.comment_count} · 点赞 ${item.like_count}`}
              renderBody={(item) => snippet(item.excerpt)}
              getLink={(item) => `/article/${item.id}`}
              busyKey={busyKey}
              onDelete={(item) => runAction(`article-${item.id}`, () => deleteAdminArticleApi(item.id), '文章已删除')}
            />
          )}

          {activeTab === 'comments' && (
            <ContentList
              items={comments}
              renderTitle={(item) => snippet(item.content, 70)}
              renderMeta={(item) => `@${item.nickname || item.username} · ${formatDate(item.created_at)} · ${item.article_title}`}
              getLink={(item) => `/article/${item.article_id}`}
              busyKey={busyKey}
              onDelete={(item) => runAction(`comment-${item.id}`, () => deleteAdminCommentApi(item.id), '评论已删除')}
            />
          )}

          {activeTab === 'messages' && (
            <ContentList
              items={messages}
              renderTitle={(item) => snippet(item.content, 80)}
              renderMeta={(item) => `${item.sender_nickname || item.sender_username} -> ${item.receiver_nickname || item.receiver_username} · ${formatDate(item.created_at)}`}
              busyKey={busyKey}
              onDelete={(item) => runAction(`message-${item.id}`, () => deleteAdminMessageApi(item.id), '私信已删除')}
            />
          )}
        </>
      )}
    </div>
  );
}

function ContentList({ items, renderTitle, renderMeta, renderBody, getLink, busyKey, onDelete }) {
  if (!items.length) {
    return <div className="bg-white rounded-xl shadow-card p-8 text-center text-sm text-app-subtext">暂无内容</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-4 border-b border-app-border last:border-b-0">
          <div className="flex-1 min-w-0">
            {getLink ? (
              <Link to={getLink(item)} className="text-sm font-semibold text-app-text hover:text-app-blue line-clamp-2">
                {renderTitle(item)}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-app-text line-clamp-2">{renderTitle(item)}</p>
            )}
            <p className="mt-1 text-xs text-app-subtext truncate">{renderMeta(item)}</p>
            {renderBody && <p className="mt-2 text-xs text-app-subtext line-clamp-2">{renderBody(item)}</p>}
          </div>
          <button
            disabled={busyKey.endsWith(`-${item.id}`)}
            onClick={() => onDelete(item)}
            title="删除"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-red hover:bg-red-50 disabled:text-app-subtext disabled:bg-app-bg transition-colors shrink-0"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
