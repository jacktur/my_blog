import ChatMenu from './ChatMenu';

export default function ChatHeader({ conversation, onLogout }) {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar?.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  if (!conversation) return null;

  const displayName = conversation.other_nickname || conversation.other_username;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-300">
          <img
            src={getAvatarUrl(conversation.other_avatar)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/uploads/avatars/defaults/default-1.svg'; }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-900">{displayName}</span>
      </div>
      <ChatMenu onLogout={onLogout} />
    </div>
  );
}
