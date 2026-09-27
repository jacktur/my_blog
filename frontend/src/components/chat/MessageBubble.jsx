import { Lock } from 'lucide-react';

export default function MessageBubble({ message, isMine }) {
  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d + 'Z');
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.encryption_mode === 'e2ee' && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] mt-1 ${
              isMine ? 'text-blue-200' : 'text-gray-500'
            }`}
            title={message.decryptionError || '端到端加密消息'}
          >
            <Lock size={10} />
            {message.decryptionPending ? '密文' : '端到端加密'}
          </span>
        )}
        <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
