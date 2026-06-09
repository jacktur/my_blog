import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import Home from './pages/Home';
import FollowingPosts from './pages/FollowingPosts';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';
import ArticleDetail from './pages/ArticleDetail';
import CreateArticle from './pages/CreateArticle';
import SearchResults from './pages/SearchResults';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import ReadingListPage from './pages/ReadingListPage';
import DashboardPage from './pages/DashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AchievementsPage from './pages/AchievementsPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import { XpNotificationProvider } from './components/XPNotification';

function AppContent() {
  const location = useLocation();
  const isChat = location.pathname === '/chat';
  const isWidePage = isChat || location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex justify-center">
        <div className="flex w-full max-w-7xl gap-6 px-4 py-4">
          <LeftSidebar />
          <main className={`flex-1 min-w-0 ${isWidePage ? '' : 'max-w-2xl'}`}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/following" element={<FollowingPosts />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
              <Route path="/article/:id" element={<ArticleDetail />} />
              <Route path="/create" element={<CreateArticle />} />
              <Route path="/edit/:id" element={<CreateArticle />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/reading-list" element={<ReadingListPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          {!isWidePage && <RightSidebar />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <XpNotificationProvider>
        <Router>
          <AppContent />
        </Router>
      </XpNotificationProvider>
    </AuthProvider>
  );
}
