import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 时清除本地认证信息
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthError =
      err.response?.status === 401 ||
      (err.response?.status === 403 && err.response?.data?.error?.includes('令牌'));

    if (isAuthError) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ====== Auth API ======
export const registerApi = (username, password) =>
  api.post('/auth/register', { username, password });
export const loginApi = (username, password) =>
  api.post('/auth/login', { username, password });

// ====== Articles API ======
export const getArticlesApi = (tag) => {
  const params = tag ? { tag } : {};
  return api.get('/articles', { params });
};
export const getArticleApi = (id) => api.get(`/articles/${id}`);
export const createArticleApi = (title, content, tags, extra = {}) =>
  api.post('/articles', { title, content, tags, ...extra });
export const updateArticleApi = (id, title, content, tags, extra = {}) =>
  api.put(`/articles/${id}`, { title, content, tags, ...extra });
export const deleteArticleApi = (id) => api.delete(`/articles/${id}`);

// ====== Following API ======
export const getFollowingArticlesApi = () =>
  api.get('/articles', { params: { scope: 'following' } });

// ====== Search API ======
export const searchArticlesApi = (q) =>
  api.get('/articles/search', { params: { q } });

// ====== Tags API ======
export const getTagsApi = () => api.get('/tags');

// ====== Comments API ======
export const getCommentsApi = (articleId) => api.get(`/articles/${articleId}/comments`);
export const createCommentApi = (articleId, content) =>
  api.post(`/articles/${articleId}/comments`, { content });
export const deleteCommentApi = (articleId, commentId) =>
  api.delete(`/articles/${articleId}/comments/${commentId}`);

// ====== Likes API ======
export const getLikeCountApi = (articleId) => api.get(`/articles/${articleId}/likes/count`);
export const checkLikeStatusApi = (articleId) => api.get(`/articles/${articleId}/likes/check`);
export const likeArticleApi = (articleId) => api.post(`/articles/${articleId}/like`);

// ====== Users API ======
export const getUserProfileApi = (id) => api.get(`/users/${id}`);
export const getUserArticlesApi = (id) => api.get(`/users/${id}/articles`);
export const getUserStatsApi = (id) => api.get(`/users/${id}/stats`);
export const updateProfileApi = (data) => api.put('/users/profile', data);
export const getDefaultAvatarsApi = () => api.get('/users/avatars/defaults');

// ====== Follows API ======
export const followUserApi = (userId) => api.post(`/follows/${userId}`);
export const unfollowUserApi = (userId) => api.delete(`/follows/${userId}`);
export const checkFollowStatusApi = (userId) => api.get(`/follows/${userId}/check`);
export const getFollowCountApi = (userId) => api.get(`/follows/${userId}/count`);

// ====== Upload API ======
export const uploadAvatarApi = (file) => {
  const fd = new FormData(); fd.append('avatar', file);
  return api.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const uploadCoverApi = (file) => {
  const fd = new FormData(); fd.append('cover', file);
  return api.post('/upload/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ====== Notifications API ======
export const getNotificationsApi = (params) => api.get('/notifications', { params });
export const getUnreadCountApi = () => api.get('/notifications/unread-count');
export const markNotificationReadApi = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsReadApi = () => api.put('/notifications/read-all');

// ====== Reading Progress API ======
export const getReadingProgressApi = (articleId) => api.get(`/articles/${articleId}/progress`);
export const saveReadingProgressApi = (articleId, scrollPercentage) =>
  api.put(`/articles/${articleId}/progress`, { scrollPercentage });

// ====== Bookmarks API ======
export const getBookmarksApi = (params) => api.get('/bookmarks', { params });
export const addBookmarkApi = (articleId) => api.post('/bookmarks', { article_id: articleId });
export const removeBookmarkApi = (articleId) => api.delete(`/bookmarks/${articleId}`);
export const checkBookmarkApi = (articleId) => api.get(`/bookmarks/${articleId}/check`);

// ====== Gamification API ======
export const getGamificationUserApi = () => api.get('/gamification/user');
export const dailyCheckinApi = () => api.post('/gamification/checkin');
export const getXpHistoryApi = (params) => api.get('/gamification/xp-history', { params });
export const getLeaderboardApi = () => api.get('/gamification/leaderboard');
export const getAchievementsApi = () => api.get('/gamification/achievements');
export const getDashboardApi = () => api.get('/gamification/dashboard');

// ====== Drafts API ======
export const getDraftsApi = () => api.get('/drafts');
export const createDraftApi = (data) => api.post('/drafts', data);
export const updateDraftApi = (id, data) => api.put(`/drafts/${id}`, data);
export const deleteDraftApi = (id) => api.delete(`/drafts/${id}`);
export const publishDraftApi = (id) => api.post(`/drafts/${id}/publish`);

// ====== Series API ======
export const getSeriesApi = () => api.get('/series');
export const getSeriesDetailApi = (id) => api.get(`/series/${id}`);
export const createSeriesApi = (data) => api.post('/series', data);
export const updateSeriesApi = (id, data) => api.put(`/series/${id}`, data);
export const deleteSeriesApi = (id) => api.delete(`/series/${id}`);
export const addArticleToSeriesApi = (seriesId, articleId) =>
  api.post(`/series/${seriesId}/articles`, { article_id: articleId });
export const removeArticleFromSeriesApi = (seriesId, articleId) =>
  api.delete(`/series/${seriesId}/articles/${articleId}`);

// ====== Tag Suggestions ======
export const getTagSuggestionsApi = (title, content) =>
  api.post('/tags/suggest', { title, content });

// ====== Article Summary ======
export const getArticleSummaryApi = (content) =>
  api.post('/articles/summarize', { content });

// ====== Chat API ======
export const getConversationsApi = (params) =>
  api.get('/conversations', { params });
export const createConversationApi = (targetUserId) =>
  api.post('/conversations', { targetUserId });
export const getMessagesApi = (conversationId, params) =>
  api.get(`/conversations/${conversationId}/messages`, { params });
export const sendMessageApi = (conversationId, content) =>
  api.post(`/conversations/${conversationId}/messages`, { content });
export const markConversationReadApi = (conversationId) =>
  api.put(`/conversations/${conversationId}/read`);

export default api;
