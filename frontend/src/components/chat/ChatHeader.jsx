import ChatMenu from './ChatMenu';
import { Link } from 'react-router-dom';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { formatFingerprint } from '../../utils/e2ee';

export default function ChatHeader({ conversation, onLogout, cryptoStatus, cryptoInfo }) {
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
        <div>
          <span className="text-sm font-semibold text-gray-900">{displayName}</span>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            {cryptoStatus === 'ready' && (
              <>
                <ShieldCheck size={11} className="text-emerald-600" />
                <span className="text-emerald-700">端到端加密</span>
                <span title={`对方公钥指纹：${formatFingerprint(cryptoInfo?.fingerprint)}`}>
                  · 指纹已生成
                </span>
              </>
            )}
            {cryptoStatus === 'waiting' && (
              <>
                <Lock size={11} className="text-amber-600" />
                <span>等待对方安全密钥</span>
              </>
            )}
            {cryptoStatus === 'preparing' && (
              <>
                <Lock size={11} className="text-blue-600" />
                <span>正在建立安全连接</span>
              </>
            )}
            {cryptoStatus === 'error' && (
              <>
                <TriangleAlert size={11} className="text-red-600" />
                <span className="text-red-600">安全连接异常</span>
              </>
            )}
            {cryptoInfo?.fingerprintChanged && (
              <span className="text-red-600" title="请先通过其他渠道核对对方新指纹">
                · 指纹已变化
              </span>
            )}
          </div>
        </div>
      </div>
      <ChatMenu onLogout={onLogout} />
    </div>
  );
}
