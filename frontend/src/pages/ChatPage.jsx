import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_ORIGIN, getConversationsApi, createConversationApi, getMessagesApi, sendMessageApi, markConversationReadApi } from '../api';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatContent from '../components/chat/ChatContent';

function getWebSocketUrl(token) {
  const configuredWsOrigin = (import.meta.env.VITE_WS_ORIGIN || '').replace(/\/$/, '');
  if (configuredWsOrigin) {
    return `${configuredWsOrigin}/ws?token=${encodeURIComponent(token)}`;
  }

  if (API_ORIGIN) {
    const apiUrl = new URL(API_ORIGIN);
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${apiUrl.host}/ws?token=${encodeURIComponent(token)}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.DEV ? 'localhost:3001' : window.location.host;
  return `${protocol}//${wsHost}/ws?token=${encodeURIComponent(token)}`;
}

export default function ChatPage() {
  const { isAuthenticated, user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fetchId = useRef(0);

  const appendMessage = useCallback((message) => {
    setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
  }, []);

  const fetchConversations = useCallback(async () => {
    const id = ++fetchId.current;
    try {
      const res = await getConversationsApi();
      if (id !== fetchId.current) return; // 忽略过时的响应
      setConversations(res.data.conversations);
    } catch (err) {
      setError(err.response?.data?.error || '获取会话列表失败');
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
        const messagesRes = await getMessagesApi(convId);
        setMessages(messagesRes.data.messages.reverse());
        await markConversationReadApi(convId);
        navigate('/chat', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || '创建会话失败');
        console.error('[CHAT] 创建会话失败:', err.message);
      }
    })();
  }, [conversations, fetchConversations, isAuthenticated, loading, navigate, searchParams]);

  const handleSelectConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    setError('');
    try {
      const res = await getMessagesApi(convId);
      setMessages(res.data.messages.reverse());
      await markConversationReadApi(convId);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.error || '获取消息失败');
      console.error('[CHAT] 获取消息失败:', err.message);
    }
  }, [fetchConversations]);

  const refreshActiveConversation = useCallback(async () => {
    if (!activeConvId) return;
    try {
      const res = await getMessagesApi(activeConvId);
      setMessages(res.data.messages.reverse());
      fetchConversations();
    } catch {
      return undefined;
    }
  }, [activeConvId, fetchConversations]);

  useEffect(() => {
    if (!isAuthenticated || !activeConvId) return undefined;
    const interval = window.setInterval(refreshActiveConversation, 8000);
    return () => window.clearInterval(interval);
  }, [activeConvId, isAuthenticated, refreshActiveConversation]);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const ws = new WebSocket(getWebSocketUrl(token));
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if ((payload.type === 'message' || payload.type === 'message_sent') && payload.message) {
          if (payload.conversationId === activeConvId) {
            appendMessage(payload.message);
            markConversationReadApi(payload.conversationId).catch(() => {});
          }
          fetchConversations();
        }
      } catch {
        return undefined;
      }
    };
    ws.onerror = () => {};
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [activeConvId, appendMessage, fetchConversations, isAuthenticated, token]);

  useEffect(() => {
    const conversationId = parseInt(searchParams.get('conversation'), 10);
    if (!conversationId || loading) return;
    if (activeConvId === conversationId) return;
    const exists = conversations.some(c => c.id === conversationId);
    if (exists) handleSelectConversation(conversationId);
  }, [activeConvId, conversations, handleSelectConversation, loading, searchParams]);

  const handleSendMessage = async (content) => {
    if (!activeConvId || !content.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await sendMessageApi(activeConvId, content.trim());
      appendMessage(res.data.message);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.error || '消息发送失败');
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
        error={error}
        onLogout={handleLogout}
        user={user}
      />
    </div>
  );
}
