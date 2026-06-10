import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { addArticleToSeriesApi, createArticleApi, updateArticleApi, getArticleApi, createDraftApi, deleteDraftApi, getDraftApi, getMySeriesApi, updateDraftApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Eye, FileText, Save } from 'lucide-react';
import TagInput from '../components/TagInput';
import CoverImageUploader from '../components/CoverImageUploader';
import { useXpNotification } from '../components/XPNotification';

export default function CreateArticle() {
  const { id } = useParams(); const isEdit = !!id;
  const [searchParams] = useSearchParams();
  const initialDraftId = searchParams.get('draft');
  const quickMode = searchParams.get('quick');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { notifyGamification } = useXpNotification();
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [tags, setTags] = useState([]); const [coverImage, setCoverImage] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(initialDraftId);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState('write');
  const [mySeries, setMySeries] = useState([]);
  const [seriesId, setSeriesId] = useState('');
  const [fetching, setFetching] = useState(isEdit || !!initialDraftId);

  useEffect(() => {
    if (isEdit && id) {
      getArticleApi(id).then(res => {
        setTitle(res.data.article.title); setContent(res.data.article.content);
        setTags(res.data.article.tags?.map(t => t.name) || []); setCoverImage(res.data.article.cover_image || '');
        setDirty(false);
      }).catch(() => setError('文章不存在')).finally(() => setFetching(false));
    } else if (initialDraftId) {
      getDraftApi(initialDraftId).then(res => {
        const draft = res.data.draft;
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setTags(draft.tags ? draft.tags.split(',').filter(Boolean) : []);
        setCoverImage(draft.cover_image || '');
        setDirty(false);
      }).catch(() => setError('草稿不存在')).finally(() => setFetching(false));
    }
  }, [id, isEdit, initialDraftId]);

  useEffect(() => {
    if (isEdit || initialDraftId) return;
    if (quickMode === 'image') {
      setTitle('图片分享');
      setContent('上传封面图后，可以在这里补充图片背后的故事。');
      setDirty(true);
    } else if (quickMode === 'link') {
      setTitle('链接分享');
      setContent('[链接标题](https://example.com)\n\n写下你推荐这个链接的理由。');
      setDirty(true);
    }
  }, [isEdit, initialDraftId, quickMode]);

  useEffect(() => {
    if (isAuthenticated) getMySeriesApi().then(res => setMySeries(res.data.series || [])).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!isAuthenticated) return <div className="max-w-lg mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;
  if (fetching) return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>;

  const markDirty = (setter) => (value) => {
    setter(value);
    setDirty(true);
    setSuccess('');
  };

  const handleSaveDraft = async () => {
    setError(''); setSuccess('');
    setSavingDraft(true);
    try {
      const payload = { title, content, tags, cover_image: coverImage || null, article_id: isEdit ? id : null };
      if (draftId) await updateDraftApi(draftId, payload);
      else {
        const res = await createDraftApi(payload);
        setDraftId(String(res.data.draft.id));
      }
      setDirty(false);
      setSuccess('草稿已保存');
    } catch (err) { setError(err.response?.data?.error || '保存草稿失败'); }
    finally { setSavingDraft(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const t = title.trim(); const c = content.trim();
    if (!t) return setError('标题不能为空');
    if (!c) return setError('内容不能为空');
    setLoading(true);
    try {
      const articleData = { cover_image: coverImage || undefined };
      if (isEdit) await updateArticleApi(id, t, c, tags, articleData);
      else {
        const res = await createArticleApi(t, c, tags, articleData);
        if (seriesId) await addArticleToSeriesApi(seriesId, res.data.article.id).catch(() => {});
        if (draftId) await deleteDraftApi(draftId).catch(() => {});
        notifyGamification(res.data.gamification);
        setDirty(false);
        navigate(`/article/${res.data.article.id}`);
        return;
      }
      setDirty(false);
      navigate(`/article/${id}`);
    } catch (err) { setError(err.response?.data?.error || '操作失败'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-app-bg border border-app-border text-app-text placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all";
  const previewHtml = DOMPurify.sanitize(marked.parse(content || ''));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm">
          <ArrowLeft size={14} /> 返回
        </Link>
        <h2 className="text-lg font-bold text-app-text">{isEdit ? '编辑文章' : draftId ? '编辑草稿' : '写文章'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-app-subtext mb-1.5">标题</label>
          <input type="text" value={title} onChange={e => markDirty(setTitle)(e.target.value)} maxLength={200}
            className={inputClass + " text-lg font-semibold"} placeholder="文章标题..." />
        </div>
        <div className="flex w-fit gap-1 rounded-xl bg-app-bg p-1">
          <button type="button" onClick={() => setMode('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'write' ? 'bg-white text-app-text shadow-sm' : 'text-app-subtext hover:text-app-text'}`}>
            <FileText size={13} /> 编辑
          </button>
          <button type="button" onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'preview' ? 'bg-white text-app-text shadow-sm' : 'text-app-subtext hover:text-app-text'}`}>
            <Eye size={13} /> 预览
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-subtext mb-1.5">内容 (Markdown)</label>
          {mode === 'write' ? (
            <textarea value={content} onChange={e => markDirty(setContent)(e.target.value)} rows={16}
              className={inputClass + " resize-y font-mono text-sm"} placeholder="在此输入 Markdown 内容..." />
          ) : (
            <div className="min-h-[420px] rounded-xl bg-white border border-app-border px-4 py-3">
              {content.trim()
                ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                : <p className="text-app-subtext text-sm">预览会显示在这里</p>}
            </div>
          )}
        </div>
        <TagInput tags={tags} onChange={markDirty(setTags)} />
        <CoverImageUploader currentImage={coverImage} onImageChange={markDirty(setCoverImage)} />
        {mySeries.length > 0 && !isEdit && (
          <div>
            <label className="block text-xs font-medium text-app-subtext mb-1.5">加入系列（可选）</label>
            <select value={seriesId} onChange={e => setSeriesId(e.target.value)} className={inputClass}>
              <option value="">不加入系列</option>
              {mySeries.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </div>
        )}
        <div className="px-3 py-2 rounded-xl bg-app-bg border border-app-border"><p className="text-app-subtext text-xs">支持 Markdown 语法</p></div>
        {success && <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-100"><p className="text-app-green text-xs">{success}</p></div>}
        {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">
            <Save size={15} /> {loading ? '保存中...' : isEdit ? '更新' : '发布'}
          </button>
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-app-border text-app-text text-sm hover:bg-app-bg disabled:opacity-50 transition-colors">
            <FileText size={15} /> {savingDraft ? '保存草稿中...' : '保存草稿'}
          </button>
          <Link to="/drafts" className="px-5 py-2.5 rounded-xl border border-app-border text-app-subtext text-sm hover:bg-app-bg transition-colors flex items-center">草稿箱</Link>
          <Link to="/" className="px-5 py-2.5 rounded-xl border border-app-border text-app-subtext text-sm hover:bg-app-bg transition-colors flex items-center">取消</Link>
        </div>
      </form>
    </div>
  );
}
