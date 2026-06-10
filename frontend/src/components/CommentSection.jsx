import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommentsApi, createCommentApi, deleteCommentApi, getLikeCountApi, checkLikeStatusApi, likeArticleApi, reportApi } from '../api';
import { MessageSquare, ThumbsUp, Send, Trash2 } from 'lucide-react';
import { useXpNotification } from './XPNotification';
import { getAvatarUrl, getDisplayName } from '../utils/displayName';
import ReportDialog from './ReportDialog';
import { useConfirm } from './ConfirmDialog';

export default function CommentSection({ articleId }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { notifyGamification } = useXpNotification();
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [remainingLikes, setRemainingLikes] = useState(5);
  const [liking, setLiking] = useState(false);
  const [reportTargetId, setReportTargetId] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([getCommentsApi(articleId), getLikeCountApi(articleId)])
      .then(([cRes, lRes]) => {
        setComments(cRes.data.comments);
        setLikeCount(lRes.data.likes);
      })
      .catch(() => undefined)
      .finally(() => setCommentsLoading(false));
  }, [articleId]);

  const checkLikes = useCallback(() => {
    if (!user) return;
    checkLikeStatusApi(articleId)
      .then((r) => setRemainingLikes(r.data.remainingLikes))
      .catch(() => undefined);
  }, [articleId, user]);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);
  useEffect(() => {
    Promise.resolve().then(checkLikes);
  }, [checkLikes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { alert('请先登录'); return; }
    const trimmed = commentText.trim();
    if (!trimmed || trimmed.length > 2000) return;
    setSubmitting(true);
    try {
      const r = await createCommentApi(articleId, trimmed);
      setComments((prev) => [...prev, r.data.comment]);
      setCommentText('');
      notifyGamification(r.data.gamification);
    } catch (err) { alert(err.response?.data?.error || '评论失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId) => {
    const ok = await confirm({
      title: '删除评论',
      message: '确定删除这条评论？此操作不可撤销。',
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    try { await deleteCommentApi(articleId, commentId); setComments((prev) => prev.filter((c) => c.id !== commentId)); }
    catch (err) { alert(err.response?.data?.error || '删除失败'); }
  };

  const handleReport = async (commentId) => {
    if (!user) { alert('请先登录'); return; }
    setReportTargetId(commentId);
  };

  const submitReport = async ({ reason, details }) => {
    if (!reportTargetId) return;
    setReportSubmitting(true);
    try {
      await reportApi({ targetType: 'comment', targetId: reportTargetId, reason, details });
      setReportTargetId(null);
      alert('举报已提交');
    }
    catch (err) { alert(err.response?.data?.error || '举报失败'); }
    finally { setReportSubmitting(false); }
  };

  const handleLike = async () => {
    if (!user) { alert('请先登录'); return; }
    if (remainingLikes <= 0 || liking) return;
    setLiking(true);
    try {
      const r = await likeArticleApi(articleId);
      setLikeCount(r.data.likes);
      setRemainingLikes(r.data.remainingLikes);
      notifyGamification(r.data.gamification?.self);
    } catch {
      alert('点赞失败');
    } finally { setLiking(false); }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="comments" className="mt-10 pt-8 border-t border-app-border">
      <ReportDialog
        open={!!reportTargetId}
        title="举报评论"
        submitting={reportSubmitting}
        onClose={() => setReportTargetId(null)}
        onSubmit={submitReport}
      />
      {/* Like button */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-app-border">
        <button onClick={handleLike} disabled={liking || remainingLikes <= 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-app-border bg-white
            hover:border-app-blue/30 hover:bg-app-blue/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          <ThumbsUp size={18} className="text-app-blue" />
          <span className="text-app-text font-semibold text-sm">{likeCount}</span>
          <span className="text-app-subtext text-xs">赞</span>
        </button>
        <div className="flex items-center gap-1.5 text-app-subtext text-xs">
          <MessageSquare size={14} />
          {comments.length} 条评论
        </div>
      </div>

      {/* Comments list */}
      <h3 className="text-base font-semibold text-app-text mb-4">评论 ({comments.length})</h3>

      {commentsLoading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-app-border">
          <p className="text-app-subtext text-sm">暂无评论，来发表第一条吧</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-white rounded-xl border border-app-border hover:border-app-blue/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <Link to={`/profile/${c.user_id}`} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-app-bg ring-1 ring-app-border">
                    <img
                      src={getAvatarUrl(c)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/uploads/avatars/defaults/default-1.svg'; }}
                    />
                  </div>
                  <span className="text-xs font-medium text-app-text">{getDisplayName(c)}</span>
                  <span className="text-[10px] text-app-subtext">{formatDate(c.created_at)}</span>
                </Link>
                <div className="flex items-center gap-2">
                  {user && user.id !== c.user_id && (
                    <button onClick={() => handleReport(c.id)} className="text-[10px] text-app-subtext hover:text-app-orange transition-colors">举报</button>
                  )}
                  {user && user.id === c.user_id && (
                    <button onClick={() => handleDelete(c.id)} className="text-app-subtext hover:text-app-red transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-app-text leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="写下你的评论..." maxLength={2000} rows={2}
            className="flex-1 px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-sm text-app-text placeholder-app-subtext
              focus:outline-none focus:border-app-blue/40 focus:ring-2 focus:ring-app-blue/10 resize-none transition-all" />
          <button type="submit" disabled={submitting || !commentText.trim()}
            className="self-end px-4 py-2.5 rounded-xl bg-app-blue text-white text-sm font-medium
              hover:bg-app-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            <Send size={14} />
            {submitting ? '...' : '发送'}
          </button>
        </form>
      ) : (
        <div className="text-center py-6 bg-white rounded-2xl border border-app-border">
          <p className="text-app-subtext text-sm">
            请 <Link to="/login" className="text-app-blue hover:underline">登录</Link> 后参与评论
          </p>
        </div>
      )}
    </div>
  );
}
