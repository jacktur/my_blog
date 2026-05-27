import { useState, useEffect, useCallback } from 'react';
import { getReadingProgressApi, saveReadingProgressApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ReadingProgressBar({ articleId }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user || !articleId) return;
    getReadingProgressApi(articleId)
      .then((res) => { if (res.data.scrollPercentage > 0) setProgress(res.data.scrollPercentage); })
      .catch(() => {});
  }, [articleId, user]);

  const handleScroll = useCallback(() => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? Math.min(100, Math.round((window.scrollY / docHeight) * 100)) : 0;
    setProgress(percent);
    sessionStorage.setItem(`reading:${articleId}`, String(percent));
  }, [articleId]);

  useEffect(() => {
    const cached = sessionStorage.getItem(`reading:${articleId}`);
    if (cached) setProgress(Number(cached));
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [articleId, handleScroll]);

  useEffect(() => {
    if (!user || !articleId) return;
    const interval = setInterval(() => {
      const cur = Number(sessionStorage.getItem(`reading:${articleId}`) || 0);
      if (cur > 0) saveReadingProgressApi(articleId, cur).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [articleId, user]);

  return (
    <div className="fixed top-12 left-0 right-0 z-40 h-[2px]">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, background: '#007AFF' }}
      />
    </div>
  );
}
