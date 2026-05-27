import { useState } from 'react';
import { MoreVertical, Bell, Volume2, LogOut } from 'lucide-react';

export default function ChatMenu({ onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden z-50">
            <div className="px-4 py-2.5 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
              设置
            </div>
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Bell size={15} className="text-gray-400" />
              通知设置
            </button>
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Volume2 size={15} className="text-gray-400" />
              声音
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
