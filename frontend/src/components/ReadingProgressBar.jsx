import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadingProgressApi, saveReadingProgressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useXpNotification } from './XPNotification';

export default function ReadingProgressBar({ articleId }) {
  const { user } = useAuth();
  const { notifyGamification } = useXpNotification();
  const [progress, setProgress] = useState(0);
  const lastSavedProgressRef = useRef(0);

  const saveProgress = useCallback((value) => {
    if (!user || !articleId || value <= 0) return;
    lastSavedProgressRef.current = value;
    saveReadingProgressApi(articleId, value)
      .then(res => notifyGamification(res.data.gamification))
      .catch(() => {});
  }, [articleId, notifyGamification, user]);

  useEffect(() => {
    if (!user || !articleId) return;
    getReadingProgressApi(articleId)
      .then((res) => {
        if (res.data.scrollPercentage > 0) {
          setProgress(res.data.scrollPercentage);
          lastSavedProgressRef.current = res.data.scrollPercentage;
        }
      })
      .catch(() => {});
  }, [articleId, user]);

  const handleScroll = useCallback(() => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? Math.min(100, Math.round((window.scrollY / docHeight) * 100)) : 0;
    setProgress(percent);
    sessionStorage.setItem(`reading:${articleId}`, String(percent));
    if (percent >= 90 && lastSavedProgressRef.current < 90) {
      saveProgress(percent);
    }
  }, [articleId, saveProgress]);

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
      if (cur > 0 && Math.abs(cur - lastSavedProgressRef.current) >= 5) {
        saveProgress(cur);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [articleId, saveProgress, user]);

  return (
    <div className="fixed top-12 left-0 right-0 z-40 h-[2px]">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, background: '#007AFF' }}
      />
    </div>
  );
}
