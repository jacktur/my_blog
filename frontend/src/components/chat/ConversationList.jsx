import { MessageSquare } from 'lucide-react';
import ConversationItem from './ConversationItem';

export default function ConversationList({ conversations, activeConvId, onSelectConversation }) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <MessageSquare size={28} className="mb-2 text-white/30" />
        <p className="text-xs text-white/50">暂无对话</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={activeConvId === conv.id}
          onClick={onSelectConversation}
        />
      ))}
    </div>
  );
}
