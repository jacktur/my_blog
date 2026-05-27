import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkBookmarkApi, addBookmarkApi, removeBookmarkApi } from '../api';

export default function BookmarkButton({ articleId }) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !articleId) return;
    checkBookmarkApi(articleId).then(r => setBookmarked(r.data.bookmarked)).catch(() => {});
  }, [articleId, user]);

  const handleToggle = async () => {
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    try {
      if (bookmarked) { await removeBookmarkApi(articleId); setBookmarked(false); }
      else { await addBookmarkApi(articleId); setBookmarked(true); }
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <button onClick={handleToggle} disabled={loading}
      className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${
        bookmarked ? 'text-app-orange bg-app-orange/8' : 'text-app-subtext hover:text-app-orange hover:bg-app-orange/5'
      }`}
      title={bookmarked ? '取消收藏' : '收藏'}>
      <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
    </button>
  );
}
