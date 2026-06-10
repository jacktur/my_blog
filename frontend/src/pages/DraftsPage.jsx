import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, FileText, Loader2, Send, Trash2 } from 'lucide-react';
import { deleteDraftApi, getDraftsApi, publishDraftApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmDialog';

export default function DraftsPage() {
  const { isAuthenticated } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const fetchDrafts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDraftsApi();
      setDrafts(res.data.drafts || []);
    } catch (err) {
      setError(err.response?.data?.error || '草稿加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchDrafts();
    else setLoading(false);
  }, [isAuthenticated]);

  const handlePublish = async (draft) => {
    if (!draft.title || !draft.excerpt) {
      setError('草稿标题和内容不能为空');
      return;
    }
    setBusyId(draft.id);
    setError('');
    try {
      const res = await publishDraftApi(draft.id);
      navigate(`/article/${res.data.article.id}`);
    } catch (err) {
      setError(err.response?.data?.error || '发布草稿失败');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: '删除草稿', message: '确定删除这个草稿？', confirmText: '删除', danger: true });
    if (!ok) return;
    setBusyId(id);
    setError('');
    try {
      await deleteDraftApi(id);
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || '删除草稿失败');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-app-red text-sm">请先登录</p>
        <Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4">
        <ArrowLeft size={14} /> 返回
      </Link>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-app-blue" />
          <h1 className="text-lg font-bold text-app-text">草稿箱</h1>
        </div>
        <Link to="/create" className="text-xs text-app-blue hover:underline">写新文章</Link>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-xs text-app-red">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={18} className="text-app-blue animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-card">
          <FileText size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-app-subtext text-sm">暂无草稿</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <article key={draft.id} className="bg-white rounded-2xl p-4 shadow-card border border-app-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-app-text truncate">
                    {draft.title || '未命名草稿'}
                  </h2>
                  <p className="mt-1 text-sm text-app-subtext line-clamp-2">
                    {draft.excerpt || '暂无正文'}
                  </p>
                  <p className="mt-2 text-[10px] text-app-subtext">
                    最后保存 {new Date(`${draft.updated_at}Z`).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    to={`/create?draft=${draft.id}`}
                    className="p-2 rounded-full text-app-subtext hover:text-app-blue hover:bg-app-bg transition-colors"
                    title="继续编辑"
                  >
                    <Edit3 size={15} />
                  </Link>
                  <button
                    onClick={() => handlePublish(draft)}
                    disabled={busyId === draft.id}
                    className="p-2 rounded-full text-app-subtext hover:text-app-green hover:bg-app-bg disabled:opacity-50 transition-colors"
                    title="发布草稿"
                  >
                    <Send size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    disabled={busyId === draft.id}
                    className="p-2 rounded-full text-app-subtext hover:text-app-red hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title="删除草稿"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
