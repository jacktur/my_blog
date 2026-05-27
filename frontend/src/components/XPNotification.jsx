import { useState, createContext, useContext, useCallback } from 'react';
import { Zap } from 'lucide-react';

const XpNotificationContext = createContext(null);

export function XpNotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addXpToast = useCallback((amount, reason) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, amount, reason }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 3000);
  }, []);

  return (
    <XpNotificationContext.Provider value={{ addXpToast }}>
      {children}
      <div className="fixed bottom-16 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white shadow-lg border border-app-border text-app-text text-sm font-medium animate-slide-up">
            <Zap size={15} className="text-app-orange fill-app-orange" />
            <span>+{toast.amount} XP</span>
            <span className="text-app-subtext text-xs">{toast.reason}</span>
          </div>
        ))}
      </div>
    </XpNotificationContext.Provider>
  );
}

export function useXpNotification() {
  return useContext(XpNotificationContext) || { addXpToast: () => {} };
}
