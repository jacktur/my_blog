import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCcw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmDialog';
import {
  deleteAdminArticleApi,
  deleteAdminCommentApi,
  deleteAdminMessageApi,
  getAdminActionsApi,
  getAdminArticlesApi,
  getAdminCommentsApi,
  getAdminMessagesApi,
  getAdminReportsApi,
  getAdminSummaryApi,
  getAdminUsersApi,
  restoreAdminActionApi,
  updateAdminReportStatusApi,
  updateAdminUserStatusApi,
} from '../api';
import { getDisplayName } from '../utils/displayName';

const TABS = [
  { key: 'users', label: '用户', icon: Users },
  { key: 'articles', label: '文章', icon: FileText },
  { key: 'comments', label: '评论', icon: MessageCircle },
  { key: 'messages', label: '私信', icon: MessagesSquare },
  { key: 'reports', label: '举报', icon: AlertTriangle },
  { key: 'actions', label: '日志', icon: Shield },
];

const TAB_TITLES = {
  users: '用户状态',
  articles: '文章审核',
  comments: '评论审核',
  messages: '私信巡检',
  reports: '举报处理',
  actions: '审核日志',
};

const ACTION_LABELS = {
  delete: '删除',
  ban: '封禁',
  unban: '解封',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function snippet(text, len = 110) {
  if (!text) return '无内容';
  return text.length > len ? `${text.slice(0, len)}...` : text;
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function includesQuery(values, query) {
  const q = normalize(query);
  if (!q) return true;
  return values.some((value) => normalize(value).includes(q));
}

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const confirm = useConfirm();
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
  const [reports, setReports] = useState([]);
  const [actions, setActions] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonDialog, setReasonDialog] = useState(null);

  const isAdmin = isAuthenticated && user?.role === 'admin';

  const statCards = useMemo(() => [
    { label: '注册用户', value: summary?.users ?? 0, icon: Users, tone: 'text-app-blue', bg: 'bg-blue-50' },
    { label: '今日注册', value: summary?.todayUsers ?? 0, icon: UserCheck, tone: 'text-app-green', bg: 'bg-green-50' },
    { label: '文章总量', value: summary?.articles ?? 0, icon: FileText, tone: 'text-app-purple', bg: 'bg-purple-50' },
    { label: '今日文章', value: summary?.todayArticles ?? 0, icon: Clock3, tone: 'text-app-orange', bg: 'bg-orange-50' },
    { label: '封禁用户', value: summary?.bannedUsers ?? 0, icon: UserX, tone: 'text-app-red', bg: 'bg-red-50' },
    { label: '待处理举报', value: summary?.openReports ?? 0, icon: AlertTriangle, tone: 'text-app-orange', bg: 'bg-orange-50' },
  ], [summary]);

  const loadAdminData = useCallback(async ({ quiet = false } = {}) => {
    if (!isAdmin) return;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [summaryRes, usersRes, articlesRes, commentsRes, messagesRes, reportsRes, actionsRes] = await Promise.all([
        getAdminSummaryApi(),
        getAdminUsersApi(),
        getAdminArticlesApi(),
        getAdminCommentsApi(),
        getAdminMessagesApi(),
        getAdminReportsApi(),
        getAdminActionsApi(),
      ]);
      setSummary(summaryRes.data.summary);
      setUsers(usersRes.data.users || []);
      setArticles(articlesRes.data.articles || []);
      setComments(commentsRes.data.comments || []);
      setMessages(messagesRes.data.messages || []);
      setReports(reportsRes.data.reports || []);
      setActions(actionsRes.data.actions || []);
    } catch (err) {
      setError(err.response?.data?.error || '管理后台加载失败');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAdminData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAdminData]);

  const switchTab = (key) => {
    setActiveTab(key);
    setQuery('');
    setStatusFilter('all');
  };

  const runAction = async (key, action, successText) => {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successText);
      await loadAdminData({ quiet: true });
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setBusyKey('');
    }
  };

  const requestReason = (config) => setReasonDialog(config);

  const filteredUsers = useMemo(() => users.filter((item) => {
    const statusOk = statusFilter === 'all' || item.status === statusFilter || item.role === statusFilter;
    return statusOk && includesQuery([item.username, item.nickname, item.email, item.role, item.status], query);
  }), [users, query, statusFilter]);

  const filteredArticles = useMemo(() => articles.filter((item) =>
    includesQuery([item.title, item.excerpt, item.username, item.nickname], query)
  ), [articles, query]);

  const filteredComments = useMemo(() => comments.filter((item) =>
    includesQuery([item.content, item.article_title, item.username, item.nickname], query)
  ), [comments, query]);

  const filteredMessages = useMemo(() => messages.filter((item) =>
    includesQuery([item.content, item.sender_username, item.sender_nickname, item.receiver_username, item.receiver_nickname], query)
  ), [messages, query]);

  const filteredReports = useMemo(() => reports.filter((item) => {
    const statusOk = statusFilter === 'all' || item.status === statusFilter;
    return statusOk && includesQuery([item.target_type, item.target_id, item.reason, item.details, item.reporter_username, item.reporter_nickname], query);
  }), [reports, query, statusFilter]);

  const filteredActions = useMemo(() => actions.filter((item) =>
    includesQuery([item.action_type, item.target_type, item.target_id, item.reason, item.admin_username, item.admin_nickname], query)
  ), [actions, query]);

  const currentCount = {
    users: filteredUsers.length,
    articles: filteredArticles.length,
    comments: filteredComments.length,
    messages: filteredMessages.length,
    reports: filteredReports.length,
    actions: filteredActions.length,
  }[activeTab];

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
    <div className="w-full max-w-6xl mx-auto px-2 py-2 sm:px-4 sm:py-4">
      <section className="mb-4 rounded-2xl border border-app-border bg-app-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-text text-white">
                <Shield size={18} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-app-text">站长工作台</h1>
                <p className="text-xs text-app-subtext">当前站长：{getDisplayName(user)}</p>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-app-subtext">
              集中处理用户状态、内容删除、举报流转和审核恢复，所有关键操作都会沉淀到日志。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadAdminData()}
              disabled={loading || !!busyKey}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-app-border bg-app-bg px-3 text-sm font-medium text-app-text transition-colors hover:border-app-blue/40 disabled:opacity-50"
            >
              <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
              刷新数据
            </button>
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-xl bg-app-blue px-3 text-sm font-medium text-white transition-colors hover:bg-app-blue/90"
            >
              查看前台
            </Link>
          </div>
        </div>
      </section>

      {error && <Alert tone="red" text={error} />}
      {notice && <Alert tone="green" text={notice} />}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={22} className="text-app-blue animate-spin" /></div>
      ) : (
        <>
          <section className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-card">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon size={17} className={card.tone} />
                </div>
                <p className="text-2xl font-bold text-app-text">{card.value}</p>
                <p className="mt-1 text-xs text-app-subtext">{card.label}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-app-border bg-app-card p-2 shadow-card lg:self-start">
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => switchTab(tab.key)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors lg:justify-start ${
                      activeTab === tab.key
                        ? 'bg-app-blue text-white'
                        : 'text-app-text hover:bg-app-bg'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    {tab.key === 'reports' && summary?.openReports > 0 && (
                      <span className="ml-auto hidden rounded-full bg-white/20 px-2 text-[11px] lg:inline">{summary.openReports}</span>
                    )}
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-3 rounded-2xl border border-app-border bg-app-card p-3 shadow-card">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-app-text">{TAB_TITLES[activeTab]}</h2>
                    <p className="text-xs text-app-subtext">当前显示 {currentCount} 条</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row md:max-w-xl">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜索用户名、内容、原因..."
                        className="h-10 w-full rounded-xl border border-app-border bg-app-bg pl-9 pr-8 text-sm text-app-text outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                      />
                      {query && (
                        <button
                          onClick={() => setQuery('')}
                          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-app-subtext hover:bg-app-card"
                          title="清空搜索"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {(activeTab === 'users' || activeTab === 'reports') && (
                      <div className="relative w-full sm:w-40">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="h-10 w-full appearance-none rounded-xl border border-app-border bg-app-bg pl-9 pr-3 text-sm text-app-text outline-none focus:border-app-blue/50"
                        >
                          {activeTab === 'users' ? (
                            <>
                              <option value="all">全部用户</option>
                              <option value="active">正常</option>
                              <option value="banned">已封禁</option>
                              <option value="admin">站长</option>
                            </>
                          ) : (
                            <>
                              <option value="all">全部举报</option>
                              <option value="open">待处理</option>
                              <option value="resolved">已处理</option>
                              <option value="dismissed">已驳回</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeTab === 'users' && (
                <UserList
                  users={filteredUsers}
                  currentUser={user}
                  busyKey={busyKey}
                  onToggle={(item) => requestReason({
                    title: item.status === 'banned' ? '解封用户' : '封禁用户',
                    description: `${item.nickname || item.username} · @${item.username}`,
                    placeholder: item.status === 'banned' ? '例如：申诉通过，恢复正常使用' : '例如：发布违规内容或骚扰其他用户',
                    confirmText: item.status === 'banned' ? '确认解封' : '确认封禁',
                    danger: item.status !== 'banned',
                    onSubmit: (reason) => runAction(
                      `user-${item.id}`,
                      () => updateAdminUserStatusApi(item.id, item.status === 'banned' ? 'active' : 'banned', reason),
                      item.status === 'banned' ? '用户已解封' : '用户已封禁'
                    ),
                  })}
                />
              )}

              {activeTab === 'articles' && (
                <ContentList
                  emptyText="暂无文章"
                  items={filteredArticles}
                  renderTitle={(item) => item.title}
                  renderMeta={(item) => `@${item.nickname || item.username} · ${formatDate(item.created_at)} · 浏览 ${item.view_count || 0} · 评论 ${item.comment_count} · 点赞 ${item.like_count}`}
                  renderBody={(item) => snippet(item.excerpt)}
                  getLink={(item) => `/article/${item.id}`}
                  busyKey={busyKey}
                  onDelete={(item) => requestReason({
                    title: '删除文章',
                    description: item.title,
                    placeholder: '例如：违规广告、恶意引战、侵犯他人权益',
                    confirmText: '删除文章',
                    danger: true,
                    onSubmit: (reason) => runAction(`article-${item.id}`, () => deleteAdminArticleApi(item.id, reason), '文章已删除'),
                  })}
                />
              )}

              {activeTab === 'comments' && (
                <ContentList
                  emptyText="暂无评论"
                  items={filteredComments}
                  renderTitle={(item) => snippet(item.content, 80)}
                  renderMeta={(item) => `@${item.nickname || item.username} · ${formatDate(item.created_at)} · ${item.article_title}`}
                  getLink={(item) => `/article/${item.article_id}`}
                  busyKey={busyKey}
                  onDelete={(item) => requestReason({
                    title: '删除评论',
                    description: snippet(item.content, 120),
                    placeholder: '例如：辱骂、人身攻击、垃圾信息',
                    confirmText: '删除评论',
                    danger: true,
                    onSubmit: (reason) => runAction(`comment-${item.id}`, () => deleteAdminCommentApi(item.id, reason), '评论已删除'),
                  })}
                />
              )}

              {activeTab === 'messages' && (
                <ContentList
                  emptyText="暂无私信"
                  items={filteredMessages}
                  renderTitle={(item) => snippet(item.content, 90)}
                  renderMeta={(item) => `${item.sender_nickname || item.sender_username} -> ${item.receiver_nickname || item.receiver_username} · ${formatDate(item.created_at)}`}
                  busyKey={busyKey}
                  onDelete={(item) => requestReason({
                    title: '删除私信',
                    description: snippet(item.content, 120),
                    placeholder: '例如：骚扰、诈骗、恶意链接',
                    confirmText: '删除私信',
                    danger: true,
                    onSubmit: (reason) => runAction(`message-${item.id}`, () => deleteAdminMessageApi(item.id, reason), '私信已删除'),
                  })}
                />
              )}

              {activeTab === 'reports' && (
                <ReportList
                  reports={filteredReports}
                  busyKey={busyKey}
                  onResolve={(item) => runAction(`report-${item.id}`, () => updateAdminReportStatusApi(item.id, 'resolved'), '举报已处理')}
                  onDismiss={async (item) => {
                    const ok = await confirm({
                      title: '驳回举报',
                      message: '确认将这条举报标记为已驳回？',
                      confirmText: '驳回',
                    });
                    if (ok) runAction(`dismiss-report-${item.id}`, () => updateAdminReportStatusApi(item.id, 'dismissed'), '举报已驳回');
                  }}
                />
              )}

              {activeTab === 'actions' && (
                <ActionList
                  actions={filteredActions}
                  busyKey={busyKey}
                  onRestore={async (item) => {
                    const ok = await confirm({
                      title: '恢复内容',
                      message: `确认恢复 ${item.target_type} #${item.target_id}？`,
                      confirmText: '恢复',
                    });
                    if (ok) runAction(`restore-${item.id}`, () => restoreAdminActionApi(item.id), '内容已恢复');
                  }}
                />
              )}
            </section>
          </div>
        </>
      )}

      {reasonDialog && (
        <ReasonDialog
          {...reasonDialog}
          busy={!!busyKey}
          onClose={() => setReasonDialog(null)}
        />
      )}
    </div>
  );
}

function Alert({ tone, text }) {
  const styles = tone === 'red'
    ? 'border-red-100 bg-red-50 text-app-red'
    : 'border-green-100 bg-green-50 text-app-green';
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles}`}>{text}</div>;
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-10 text-center text-sm text-app-subtext shadow-card">
      {text}
    </div>
  );
}

function UserList({ users, currentUser, busyKey, onToggle }) {
  if (!users.length) return <EmptyState text="没有匹配的用户" />;

  return (
    <div className="space-y-2">
      {users.map((item) => {
        const disabled = busyKey === `user-${item.id}` || item.id === currentUser.id || item.role === 'admin';
        return (
          <article key={item.id} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-app-text">{item.nickname || item.username}</h3>
                  <span className="rounded-lg bg-app-bg px-2 py-1 text-[11px] text-app-subtext">@{item.username}</span>
                  {item.role === 'admin' && <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] text-app-blue">站长</span>}
                  <span className={`rounded-lg px-2 py-1 text-[11px] ${item.status === 'banned' ? 'bg-red-50 text-app-red' : 'bg-green-50 text-app-green'}`}>
                    {item.status === 'banned' ? '已封禁' : '正常'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-app-subtext">{item.email || '未绑定邮箱'} · 注册 {formatDate(item.created_at)}</p>
                <p className="mt-2 text-xs text-app-subtext">文章 {item.article_count} · 评论 {item.comment_count} · 私信 {item.message_count}</p>
              </div>
              <button
                disabled={disabled}
                onClick={() => onToggle(item)}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-white transition-colors disabled:bg-app-border disabled:text-app-subtext ${
                  item.status === 'banned' ? 'bg-app-green hover:bg-app-green/90' : 'bg-app-red hover:bg-app-red/90'
                }`}
              >
                {item.status === 'banned' ? <UserCheck size={15} /> : <UserX size={15} />}
                {item.status === 'banned' ? '解封' : '封禁'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ContentList({ emptyText, items, renderTitle, renderMeta, renderBody, getLink, busyKey, onDelete }) {
  if (!items.length) return <EmptyState text={emptyText} />;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {getLink ? (
                <Link to={getLink(item)} className="text-sm font-semibold text-app-text hover:text-app-blue line-clamp-2">
                  {renderTitle(item)}
                </Link>
              ) : (
                <h3 className="text-sm font-semibold text-app-text line-clamp-2">{renderTitle(item)}</h3>
              )}
              <p className="mt-1 text-xs text-app-subtext line-clamp-1">{renderMeta(item)}</p>
              {renderBody && <p className="mt-3 text-sm leading-6 text-app-subtext line-clamp-2">{renderBody(item)}</p>}
            </div>
            <button
              disabled={busyKey.endsWith(`-${item.id}`)}
              onClick={() => onDelete(item)}
              title="删除"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-app-red transition-colors hover:bg-red-50 disabled:text-app-subtext disabled:hover:bg-transparent"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReportList({ reports, busyKey, onResolve, onDismiss }) {
  if (!reports.length) return <EmptyState text="没有匹配的举报" />;

  return (
    <div className="space-y-2">
      {reports.map((item) => (
        <article key={item.id} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-app-text">{item.target_type} #{item.target_id}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-app-text">{item.reason}</p>
              {item.details && <p className="mt-1 text-sm leading-6 text-app-subtext">{item.details}</p>}
              <p className="mt-2 text-xs text-app-subtext">
                举报人 {item.reporter_nickname || item.reporter_username} · {formatDate(item.created_at)}
                {item.resolver_username ? ` · 处理人 ${item.resolver_nickname || item.resolver_username}` : ''}
              </p>
            </div>
            {item.status === 'open' && (
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={busyKey === `report-${item.id}`}
                  onClick={() => onResolve(item)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-app-blue px-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  处理
                </button>
                <button
                  disabled={busyKey === `dismiss-report-${item.id}`}
                  onClick={() => onDismiss(item)}
                  className="h-9 rounded-xl border border-app-border px-3 text-sm text-app-text hover:bg-app-bg disabled:opacity-50"
                >
                  驳回
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    open: 'bg-orange-50 text-app-orange',
    resolved: 'bg-green-50 text-app-green',
    dismissed: 'bg-app-bg text-app-subtext',
  };
  const text = {
    open: '待处理',
    resolved: '已处理',
    dismissed: '已驳回',
  };
  return <span className={`rounded-lg px-2 py-1 text-[11px] ${map[status] || map.dismissed}`}>{text[status] || status}</span>;
}

function ActionList({ actions, busyKey, onRestore }) {
  if (!actions.length) return <EmptyState text="没有匹配的审核日志" />;

  return (
    <div className="space-y-2">
      {actions.map((item) => (
        <article key={item.id} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-app-text">
                  {ACTION_LABELS[item.action_type] || item.action_type} {item.target_type} #{item.target_id}
                </h3>
                {item.undone_at && <span className="rounded-lg bg-green-50 px-2 py-1 text-[11px] text-app-green">已恢复</span>}
              </div>
              <p className="mt-1 text-xs text-app-subtext">
                {item.admin_nickname || item.admin_username} · {formatDate(item.created_at)}
                {item.undone_at ? ` · 恢复于 ${formatDate(item.undone_at)}` : ''}
              </p>
              {item.reason && <p className="mt-3 text-sm leading-6 text-app-subtext line-clamp-2">原因：{item.reason}</p>}
            </div>
            {item.action_type === 'delete' && !item.undone_at && (
              <button
                disabled={busyKey === `restore-${item.id}`}
                onClick={() => onRestore(item)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-app-border px-3 text-sm font-medium text-app-blue hover:bg-app-bg disabled:opacity-50"
              >
                <RotateCcw size={15} />
                恢复
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ReasonDialog({ title, description, placeholder, confirmText, danger, onSubmit, onClose, busy }) {
  const [reason, setReason] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const value = reason.trim();
    if (!value) return;
    await onSubmit(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-app-text">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-app-subtext line-clamp-2">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-app-subtext hover:bg-app-bg">
            <X size={16} />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          maxLength={180}
          autoFocus
          className="mt-4 min-h-28 w-full resize-none rounded-xl border border-app-border bg-app-bg p-3 text-sm leading-6 text-app-text outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-app-subtext">
          <span>必须填写处理原因，便于后续追溯</span>
          <span>{reason.trim().length}/180</span>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-app-border px-4 text-sm text-app-text hover:bg-app-bg">取消</button>
          <button
            type="submit"
            disabled={busy || !reason.trim()}
            className={`h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-app-red' : 'bg-app-blue'}`}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  );
}
