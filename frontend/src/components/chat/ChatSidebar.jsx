import { Mail } from 'lucide-react';
import UserCard from './UserCard';
import ConversationList from './ConversationList';

export default function ChatSidebar({ conversations, activeConvId, onSelectConversation, user, onLogout }) {
  return (
    <div className="w-80 flex flex-col shrink-0" style={{ backgroundColor: 'rgb(128,128,128)' }}>
      <div className="px-4 py-3 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-white/80" />
          <h2 className="text-sm font-semibold text-white">私信</h2>
        </div>
      </div>
      <ConversationList
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={onSelectConversation}
      />
      <UserCard user={user} onLogout={onLogout} />
    </div>
  );
}
