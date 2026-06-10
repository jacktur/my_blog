import ChatMenu from './ChatMenu';
import { Link } from 'react-router-dom';

export default function ChatHeader({ conversation, onLogout }) {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar?.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  if (!conversation) return null;

  const displayName = conversation.other_nickname || conversation.other_username;
  const profilePath = conversation.other_user_id ? `/profile/${conversation.other_user_id}` : null;
  const avatar = (
    <img
      src={getAvatarUrl(conversation.other_avatar)}
      alt={displayName || '用户头像'}
      className="w-full h-full object-cover"
      onError={(e) => { e.target.src = '/uploads/avatars/defaults/default-1.svg'; }}
    />
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-300">
          {profilePath ? (
            <Link
              to={profilePath}
              className="block h-full w-full"
              title="查看主页"
              aria-label={`查看 ${displayName || '对方'} 的主页`}
            >
              {avatar}
            </Link>
          ) : avatar}
        </div>
        <span className="text-sm font-semibold text-gray-900">{displayName}</span>
      </div>
      <ChatMenu onLogout={onLogout} />
    </div>
  );
}
