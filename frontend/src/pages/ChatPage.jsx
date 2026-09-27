import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  API_ORIGIN,
  getConversationsApi,
  createConversationApi,
  getMessagesApi,
  sendMessageApi,
  markConversationReadApi,
  getConversationCryptoApi,
  uploadCryptoKeyApi
} from '../api';
import {
  ensureIdentity,
  getPublicIdentity,
  calculateFingerprint,
  encryptMessage,
  decryptMessage,
  isEncryptedMessage
} from '../utils/e2ee';
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
  const [cryptoStatus, setCryptoStatus] = useState('idle');
  const [cryptoInfo, setCryptoInfo] = useState(null);
  const fetchId = useRef(0);
  const cryptoContextRef = useRef(null);

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

  const decodeMessages = useCallback(async (rawMessages, context) => {
    if (!context) {
      return rawMessages.map(message => (
        message.encryption_mode === 'e2ee' && isEncryptedMessage(message.content)
          ? { ...message, content: '🔒 等待安全密钥后解密', decryptionPending: true }
          : message
      ));
    }

    return Promise.all(rawMessages.map(async message => {
      if (message.encryption_mode !== 'e2ee' || !isEncryptedMessage(message.content)) {
        return message;
      }

      try {
        const plaintext = await decryptMessage({
          conversationId: context.conversationId,
          message,
          identity: context.identity,
          peerKey: context.peerKey
        });
        return { ...message, content: plaintext, decrypted: true };
      } catch (err) {
        return {
          ...message,
          content: '🔒 无法解密的消息',
          decryptionPending: true,
          decryptionError: err.message
        };
      }
    }));
  }, []);

  const prepareConversationCrypto = useCallback(async (conversationId) => {
    if (!user?.id) return null;

    setCryptoStatus('preparing');
    try {
      const identity = await ensureIdentity(user.id);
      const publicIdentity = getPublicIdentity(identity);
      const [exchangeFingerprint, signingFingerprint] = await Promise.all([
        calculateFingerprint(publicIdentity.exchangePublicKey),
        calculateFingerprint(publicIdentity.signingPublicKey)
      ]);

      await uploadCryptoKeyApi({
        ...publicIdentity,
        exchangeFingerprint,
        signingFingerprint
      });

      const response = await getConversationCryptoApi(conversationId);
      const { participants, keys } = response.data;
      const peerId = participants.find(participantId => participantId !== user.id);
      const peerKey = keys.find(key => key.user_id === peerId);

      if (!peerKey) {
        cryptoContextRef.current = null;
        setCryptoStatus('waiting');
        setCryptoInfo({ status: 'waiting', peerId });
        return null;
      }

      const normalizedPeerKey = {
        exchangePublicKey: peerKey.exchange_public_key,
        signingPublicKey: peerKey.signing_public_key
      };
      const localPeerExchangeFingerprint = await calculateFingerprint(normalizedPeerKey.exchangePublicKey);
      if (localPeerExchangeFingerprint !== peerKey.exchange_fingerprint) {
        throw new Error('对方公钥指纹验证失败');
      }

      const fingerprintKey = `blog-e2ee-fingerprint:${conversationId}:${peerId}`;
      const previousFingerprint = localStorage.getItem(fingerprintKey);
      const fingerprintChanged = Boolean(
        previousFingerprint && previousFingerprint !== peerKey.exchange_fingerprint
      );
      if (!previousFingerprint) {
        localStorage.setItem(fingerprintKey, peerKey.exchange_fingerprint);
      }

      const context = {
        conversationId,
        identity,
        peerKey: normalizedPeerKey,
        peerId
      };
      cryptoContextRef.current = context;
      setCryptoStatus('ready');
      setCryptoInfo({
        status: 'ready',
        peerId,
        fingerprint: peerKey.exchange_fingerprint,
        fingerprintChanged
      });
      return context;
    } catch (err) {
      cryptoContextRef.current = null;
      setCryptoStatus('error');
      setCryptoInfo({ status: 'error', message: err.message });
      return null;
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId, options = {}) => {
    const { markRead = true } = options;
    const context = await prepareConversationCrypto(conversationId);
    const response = await getMessagesApi(conversationId);
    const rawMessages = [...response.data.messages].reverse();
    const decodedMessages = await decodeMessages(rawMessages, context);
    setMessages(decodedMessages);
    if (markRead) await markConversationReadApi(conversationId);
    await fetchConversations();
    return context;
  }, [decodeMessages, fetchConversations, prepareConversationCrypto]);

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
        await loadMessages(convId);
        navigate('/chat', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || '创建会话失败');
        console.error('[CHAT] 创建会话失败:', err.message);
      }
    })();
  }, [conversations, fetchConversations, isAuthenticated, loadMessages, loading, navigate, searchParams]);

  const handleSelectConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    setError('');
    setMessages([]);
    try {
      await loadMessages(convId);
    } catch (err) {
      setError(err.response?.data?.error || '获取消息失败');
      console.error('[CHAT] 获取消息失败:', err.message);
    }
  }, [loadMessages]);

  const refreshActiveConversation = useCallback(async () => {
    if (!activeConvId) return;
    try {
      await loadMessages(activeConvId, { markRead: false });
    } catch {
      return undefined;
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (!isAuthenticated || !activeConvId) return undefined;
    const interval = window.setInterval(refreshActiveConversation, 8000);
    return () => window.clearInterval(interval);
  }, [activeConvId, isAuthenticated, refreshActiveConversation]);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const ws = new WebSocket(getWebSocketUrl(token));
    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if ((payload.type === 'message' || payload.type === 'message_sent') && payload.message) {
          if (payload.conversationId === activeConvId) {
            const [decodedMessage] = await decodeMessages(
              [payload.message],
              cryptoContextRef.current
            );
            appendMessage(decodedMessage);
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
  }, [activeConvId, appendMessage, decodeMessages, fetchConversations, isAuthenticated, token]);

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
      let context = cryptoContextRef.current;
      if (!context || context.conversationId !== activeConvId) {
        context = await prepareConversationCrypto(activeConvId);
      }
      if (!context) {
        throw new Error('正在等待双方建立安全密钥，请稍后重试');
      }

      const encryptedContent = await encryptMessage({
        conversationId: activeConvId,
        senderId: user.id,
        plaintext: content.trim(),
        identity: context.identity,
        peerKey: context.peerKey
      });
      const res = await sendMessageApi(activeConvId, encryptedContent);
      const [decodedMessage] = await decodeMessages([res.data.message], context);
      appendMessage(decodedMessage);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.error || err.message || '消息发送失败');
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
        cryptoStatus={cryptoStatus}
        cryptoInfo={cryptoInfo}
      />
    </div>
  );
}
