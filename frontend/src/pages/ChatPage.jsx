import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversationsApi, createConversationApi, getMessagesApi, sendMessageApi, markConversationReadApi } from '../api';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatContent from '../components/chat/ChatContent';

export default function ChatPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const fetchId = useRef(0);

  const fetchConversations = useCallback(async () => {
    const id = ++fetchId.current;
    try {
      const res = await getConversationsApi();
      if (id !== fetchId.current) return; // 忽略过时的响应
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('[CHAT] 获取会话列表失败:', err.message);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      await fetchConversations();
      setLoading(false);
    })();
  }, [isAuthenticated, fetchConversations]);

  // 从 Profile 跳转过来时创建/获取会话
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (!targetUserId || !isAuthenticated || loading) return;
    (async () => {
      try {
        const res = await createConversationApi(parseInt(targetUserId));
        const convId = res.data.conversation.id;
        const exists = conversations.find(c => c.id === convId);
        if (!exists) await fetchConversations();
        setActiveConvId(convId);
        navigate('/chat', { replace: true });
      } catch (err) {
        console.error('[CHAT] 创建会话失败:', err.message);
      }
    })();
  }, [searchParams, isAuthenticated, loading]);

  const handleSelectConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const res = await getMessagesApi(convId);
      setMessages(res.data.messages.reverse());
      await markConversationReadApi(convId);
      fetchConversations();
    } catch (err) {
      console.error('[CHAT] 获取消息失败:', err.message);
    }
  };

  const handleSendMessage = async (content) => {
    if (!activeConvId || !content.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendMessageApi(activeConvId, content.trim());
      setMessages(prev => [...prev, res.data.message]);
      fetchConversations();
    } catch (err) {
      console.error('[CHAT] 发送消息失败:', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-app-subtext text-sm">
        请先登录
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] rounded-2xl overflow-hidden border border-app-border bg-white shadow-card">
      <ChatSidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={handleSelectConversation}
        user={user}
        onLogout={handleLogout}
      />
      <ChatContent
        conversations={conversations}
        activeConvId={activeConvId}
        messages={messages}
        onSendMessage={handleSendMessage}
        sending={sending}
        onLogout={handleLogout}
        user={user}
      />
    </div>
  );
}
