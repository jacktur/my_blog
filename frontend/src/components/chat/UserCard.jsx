import { LogOut } from 'lucide-react';

export default function UserCard({ user, onLogout }) {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar?.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/20">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/30">
          <img
            src={getAvatarUrl(user?.avatar)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/uploads/avatars/defaults/default-1.svg'; }}
          />
        </div>
        <span className="text-sm font-semibold text-white">{user?.username}</span>
      </div>
      <button
        onClick={onLogout}
        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors"
        title="退出登录"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
