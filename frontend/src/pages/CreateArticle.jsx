import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createArticleApi, updateArticleApi, getArticleApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import TagInput from '../components/TagInput';
import CoverImageUploader from '../components/CoverImageUploader';

export default function CreateArticle() {
  const { id } = useParams(); const isEdit = !!id;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [tags, setTags] = useState([]); const [coverImage, setCoverImage] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      getArticleApi(id).then(res => {
        setTitle(res.data.article.title); setContent(res.data.article.content);
        setTags(res.data.article.tags?.map(t => t.name) || []); setCoverImage(res.data.article.cover_image || '');
      }).catch(() => setError('文章不存在')).finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  if (!isAuthenticated) return <div className="max-w-lg mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;
  if (fetching) return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>;

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const t = title.trim(); const c = content.trim();
    if (!t) return setError('标题不能为空');
    if (!c) return setError('内容不能为空');
    setLoading(true);
    try {
      const articleData = { cover_image: coverImage || undefined };
      if (isEdit) await updateArticleApi(id, t, c, tags, articleData);
      else await createArticleApi(t, c, tags, articleData);
      navigate('/');
    } catch (err) { setError(err.response?.data?.error || '操作失败'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-app-bg border border-app-border text-app-text placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm">
          <ArrowLeft size={14} /> 返回
        </Link>
        <h2 className="text-lg font-bold text-app-text">{isEdit ? '编辑文章' : '写文章'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-app-subtext mb-1.5">标题</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
            className={inputClass + " text-lg font-semibold"} placeholder="文章标题..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-subtext mb-1.5">内容 (Markdown)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={16}
            className={inputClass + " resize-y font-mono text-sm"} placeholder="在此输入 Markdown 内容..." />
        </div>
        <TagInput tags={tags} onChange={setTags} />
        <CoverImageUploader currentImage={coverImage} onImageChange={setCoverImage} />
        <div className="px-3 py-2 rounded-xl bg-app-bg border border-app-border"><p className="text-app-subtext text-xs">支持 Markdown 语法</p></div>
        {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">
            <Save size={15} /> {loading ? '保存中...' : isEdit ? '更新' : '发布'}
          </button>
          <Link to="/" className="px-5 py-2.5 rounded-xl border border-app-border text-app-subtext text-sm hover:bg-app-bg transition-colors flex items-center">取消</Link>
        </div>
      </form>
    </div>
  );
}
