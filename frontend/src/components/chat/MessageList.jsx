import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, userId }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无消息，发送第一条消息吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isMine={msg.sender_id === userId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
