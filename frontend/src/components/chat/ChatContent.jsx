import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatContent({ conversations, activeConvId, messages, onSendMessage, sending, error, onLogout, user }) {
  const activeConversation = conversations.find(c => c.id === activeConvId);

  if (!activeConvId || !activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm">选择一个对话开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <ChatHeader conversation={activeConversation} onLogout={onLogout} />
      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-app-red">
          {error}
        </div>
      )}
      <MessageList messages={messages} userId={user?.id} />
      <MessageInput onSend={onSendMessage} sending={sending} />
    </div>
  );
}
