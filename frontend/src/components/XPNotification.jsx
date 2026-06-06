import { useState, createContext, useContext, useCallback } from 'react';
import { Award, Zap } from 'lucide-react';

const XpNotificationContext = createContext(null);

export function XpNotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 3000);
  }, []);

  const addXpToast = useCallback((amount, reason) => {
    if (!amount || amount <= 0) return;
    pushToast({ type: 'xp', amount, reason });
  }, [pushToast]);

  const addAchievementToast = useCallback((achievement) => {
    if (!achievement) return;
    pushToast({ type: 'achievement', achievement });
  }, [pushToast]);

  const notifyGamification = useCallback((payload) => {
    if (!payload) return;
    if (payload.xp?.amount) addXpToast(payload.xp.amount, payload.xp.reason || 'XP');
    if (Array.isArray(payload.achievements)) {
      payload.achievements.forEach(addAchievementToast);
    }
  }, [addAchievementToast, addXpToast]);

  return (
    <XpNotificationContext.Provider value={{ addXpToast, addAchievementToast, notifyGamification }}>
      {children}
      <div className="fixed bottom-16 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          toast.type === 'achievement' ? (
            <div key={toast.id} className="flex max-w-[280px] items-start gap-3 rounded-2xl border border-app-orange/20 bg-white px-4 py-3 text-app-text shadow-lg animate-slide-up">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-app-orange/10">
                {toast.achievement.image ? (
                  <img src={toast.achievement.image} alt="" className="h-8 w-8 object-contain" />
                ) : (
                  <Award size={16} className="text-app-orange" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-app-orange">成就解锁</p>
                <p className="truncate text-sm font-semibold">{toast.achievement.name}</p>
                <p className="text-[10px] text-app-subtext">+{toast.achievement.xpReward || 0} XP</p>
              </div>
            </div>
          ) : (
            <div key={toast.id} className="flex items-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-medium text-app-text shadow-lg animate-slide-up">
              <Zap size={15} className="fill-app-orange text-app-orange" />
              <span>+{toast.amount} XP</span>
              <span className="text-xs text-app-subtext">{toast.reason}</span>
            </div>
          )
        ))}
      </div>
    </XpNotificationContext.Provider>
  );
}

export function useXpNotification() {
  return useContext(XpNotificationContext) || {
    addXpToast: () => {},
    addAchievementToast: () => {},
    notifyGamification: () => {},
  };
}
