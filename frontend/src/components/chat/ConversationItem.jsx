export default function ConversationItem({ conversation, isActive, onClick }) {
  const getAvatarUrl = (avatar) => {
    if (!avatar) return '/uploads/avatars/defaults/default-1.svg';
    if (avatar?.startsWith('custom/')) return `/uploads/avatars/${avatar}`;
    return `/uploads/avatars/defaults/${avatar}.svg`;
  };

  const displayName = conversation.other_nickname || conversation.other_username;
  const lastMessage = conversation.last_message || '暂无消息';
  const hasUnread = conversation.unread_count > 0;

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d + 'Z');
    const diff = Date.now() - date;
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m}分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}小时前`;
    if (h < 48) return '昨天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={() => onClick(conversation.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
        ${isActive
          ? 'bg-white/20 border-l-2 border-white'
          : 'hover:bg-white/10 border-l-2 border-transparent'
        }`}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/30">
          <img
            src={getAvatarUrl(conversation.other_avatar)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/uploads/avatars/defaults/default-1.svg'; }}
          />
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold px-1">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-white/90'}`}>
            {displayName}
          </span>
          <span className="text-[10px] text-white/50 shrink-0 ml-2">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-white/80' : 'text-white/50'}`}>
          {lastMessage}
        </p>
      </div>
    </button>
  );
}
