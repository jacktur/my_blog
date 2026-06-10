import { createContext, useContext, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = ({ title = '确认操作', message = '确定继续？', confirmText = '确认', danger = false } = {}) =>
    new Promise((resolve) => {
      setDialog({ title, message, confirmText, danger, resolve });
    });

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg border border-app-border">
            <h2 className="text-base font-bold text-app-text">{dialog.title}</h2>
            <p className="mt-2 text-sm leading-6 text-app-subtext">{dialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="px-4 py-2 rounded-xl border border-app-border text-sm text-app-text hover:bg-app-bg">取消</button>
              <button onClick={() => close(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${dialog.danger ? 'bg-app-red' : 'bg-app-blue'}`}>
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
