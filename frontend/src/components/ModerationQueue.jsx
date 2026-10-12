import { useCallback, useEffect, useState } from 'react';
import { Check, Download, Loader2, RefreshCcw, X } from 'lucide-react';
import { exportModerationFeedbackApi, getModerationQueueApi, reviewArticleApi } from '../api';
import ModerationEvidence, { MODERATION_LABELS } from './ModerationEvidence';

export default function ModerationQueue() {
  const [status, setStatus] = useState('review');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [reasons, setReasons] = useState({});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setArticles((await getModerationQueueApi(status)).data.articles); }
    catch (err) { setError(err.response?.data?.error || '加载失败'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);
  const review = async (article, decision) => {
    const reason = reasons[article.id]?.trim();
    if (!reason) { setError('请填写审核理由'); return; }
    setBusy(article.id); setError('');
    try { await reviewArticleApi(article.id, decision, article.moderation_revision, reason); await load(); }
    catch (err) { setError(err.response?.data?.error || '处理失败'); }
    finally { setBusy(null); }
  };
  const download = async () => {
    try {
      const { data } = await exportModerationFeedbackApi();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'moderation-feedback.json'; link.click(); URL.revokeObjectURL(url);
    } catch { setError('导出失败'); }
  };
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-app-border pb-3">
        <select aria-label="审核状态" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-app-border bg-app-card px-2 text-sm">
          <option value="review">待复核</option>
          <option value="">全部状态</option>
          {Object.entries(MODERATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button title="刷新队列" onClick={load} disabled={loading || busy !== null} className="p-2 text-app-blue"><RefreshCcw size={17} /></button>
        <button title="导出审核反馈" onClick={download} className="ml-auto flex items-center gap-2 text-sm text-app-blue"><Download size={17} />导出反馈</button>
      </div>
      {error && <p role="alert" className="py-2 text-sm text-app-red">{error}</p>}
      {loading ? <Loader2 className="my-6 animate-spin" size={20} /> : articles.length === 0 ? <p className="py-8 text-center text-app-subtext">暂无此状态的文章</p> : articles.map((article) => (
        <article key={article.id} className="border-b border-app-border py-4">
          <h3 className="text-base font-semibold break-words">{article.title}</h3>
          <p className="mt-1 text-xs text-app-subtext">@{article.nickname || article.username} · 版本 {article.moderation_revision} · {MODERATION_LABELS[article.moderation_status]}</p>
          <ModerationEvidence moderation={article.moderation} status={article.moderation_status} />
          <details className="my-3 text-sm"><summary className="cursor-pointer text-app-blue">查看完整正文</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans">{article.content}</pre></details>
          {article.moderation_status !== 'rejected' && <>
            <textarea aria-label={`审核理由 ${article.id}`} placeholder="审核理由" maxLength={500} rows={2} value={reasons[article.id] || ''}
              onChange={(event) => setReasons((previous) => ({ ...previous, [article.id]: event.target.value }))}
              className="w-full rounded-lg border border-app-border bg-app-card p-2 text-sm" />
            <div className="mt-2 flex flex-wrap gap-3">
              <button disabled={busy !== null} onClick={() => review(article, 'published')} className="flex items-center gap-1 text-sm text-app-green disabled:opacity-50"><Check size={16} />{article.moderation_status === 'published' ? '确认正常' : '通过并发布'}</button>
              <button disabled={busy !== null} onClick={() => review(article, 'rejected')} className="flex items-center gap-1 text-sm text-app-red disabled:opacity-50"><X size={16} />驳回</button>
            </div>
          </>}
        </article>
      ))}
    </div>
  );
}
