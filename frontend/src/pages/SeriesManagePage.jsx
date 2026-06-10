import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  addArticleToSeriesApi,
  createSeriesApi,
  deleteSeriesApi,
  getMySeriesApi,
  getMySeriesArticlesApi,
  getSeriesDetailApi,
  removeArticleFromSeriesApi,
  updateSeriesApi,
} from '../api';
import { useConfirm } from '../components/ConfirmDialog';

export default function SeriesManagePage() {
  const confirm = useConfirm();
  const [series, setSeries] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeArticles, setActiveArticles] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', cover_image: '' });
  const [selectedArticle, setSelectedArticle] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [s, a] = await Promise.all([getMySeriesApi(), getMySeriesArticlesApi()]);
    setSeries(s.data.series || []);
    setArticles(a.data.articles || []);
  };

  useEffect(() => { load().catch(() => setError('加载失败')); }, []);

  const selectSeries = async (item) => {
    setActiveId(item.id);
    setForm({ title: item.title || '', description: item.description || '', cover_image: item.cover_image || '' });
    const detail = await getSeriesDetailApi(item.id);
    setActiveArticles(detail.data.articles || []);
  };

  const saveSeries = async () => {
    setError('');
    try {
      if (activeId) await updateSeriesApi(activeId, form);
      else {
        const res = await createSeriesApi(form);
        setActiveId(res.data.series.id);
      }
      await load();
    } catch (err) { setError(err.response?.data?.error || '保存失败'); }
  };

  const removeSeries = async (id) => {
    const ok = await confirm({ title: '删除系列', message: '确定删除这个系列？文章本身不会被删除。', confirmText: '删除', danger: true });
    if (!ok) return;
    await deleteSeriesApi(id);
    setActiveId(null);
    setForm({ title: '', description: '', cover_image: '' });
    setActiveArticles([]);
    await load();
  };

  const addArticle = async () => {
    if (!activeId || !selectedArticle) return;
    await addArticleToSeriesApi(activeId, Number(selectedArticle));
    await selectSeries({ id: activeId, ...form });
    setSelectedArticle('');
  };

  const removeArticle = async (articleId) => {
    await removeArticleFromSeriesApi(activeId, articleId);
    await selectSeries({ id: activeId, ...form });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <Link to="/series" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue text-sm mb-4"><ArrowLeft size={14} />返回系列</Link>
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-white rounded-2xl shadow-card border border-app-border p-3">
          <button onClick={() => { setActiveId(null); setForm({ title: '', description: '', cover_image: '' }); setActiveArticles([]); }} className="w-full mb-3 h-9 rounded-xl bg-app-blue text-white text-sm font-semibold inline-flex items-center justify-center gap-1"><Plus size={14} />新建系列</button>
          <div className="space-y-2">{series.map(item => (
            <button key={item.id} onClick={() => selectSeries(item)} className={`w-full text-left p-3 rounded-xl ${activeId === item.id ? 'bg-app-blue/10 text-app-blue' : 'hover:bg-app-bg text-app-text'}`}>
              <p className="text-sm font-semibold truncate">{item.title}</p>
              <p className="text-xs text-app-subtext">{item.article_count} 篇文章</p>
            </button>
          ))}</div>
        </aside>
        <main className="bg-white rounded-2xl shadow-card border border-app-border p-5">
          <h1 className="text-lg font-bold text-app-text mb-4">{activeId ? '编辑系列' : '新建系列'}</h1>
          {error && <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 text-app-red text-xs">{error}</div>}
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="系列标题" className="w-full h-10 px-3 rounded-xl bg-app-bg border border-app-border text-sm text-app-text outline-none" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="系列简介" rows={3} className="w-full px-3 py-2 rounded-xl bg-app-bg border border-app-border text-sm text-app-text outline-none resize-none" />
            <input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="封面图 URL，可选" className="w-full h-10 px-3 rounded-xl bg-app-bg border border-app-border text-sm text-app-text outline-none" />
            <div className="flex gap-2">
              <button onClick={saveSeries} className="px-4 py-2 rounded-xl bg-app-blue text-white text-sm font-semibold">保存</button>
              {activeId && <button onClick={() => removeSeries(activeId)} className="px-4 py-2 rounded-xl border border-app-border text-app-red text-sm font-semibold">删除系列</button>}
            </div>
          </div>
          {activeId && (
            <section className="mt-6 pt-5 border-t border-app-border">
              <h2 className="text-sm font-semibold text-app-text mb-3">系列文章</h2>
              <div className="flex gap-2 mb-3">
                <select value={selectedArticle} onChange={e => setSelectedArticle(e.target.value)} className="flex-1 h-9 px-3 rounded-xl bg-app-bg border border-app-border text-sm text-app-text">
                  <option value="">选择自己的文章</option>
                  {articles.map(article => <option key={article.id} value={article.id}>{article.title}</option>)}
                </select>
                <button onClick={addArticle} className="px-3 rounded-xl bg-app-text text-white text-sm">加入</button>
              </div>
              <div className="space-y-2">{activeArticles.map(article => (
                <div key={article.id} className="flex items-center gap-2 p-2 rounded-xl bg-app-bg">
                  <Link to={`/article/${article.id}`} className="flex-1 text-sm text-app-text hover:text-app-blue truncate">{article.title}</Link>
                  <button onClick={() => removeArticle(article.id)} className="text-app-red"><Trash2 size={14} /></button>
                </div>
              ))}</div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
