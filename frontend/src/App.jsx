import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfirmProvider } from './components/ConfirmDialog';
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
import DraftsPage from './pages/DraftsPage';
import DashboardPage from './pages/DashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AchievementsPage from './pages/AchievementsPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';
import SeriesPage from './pages/SeriesPage';
import SeriesDetailPage from './pages/SeriesDetailPage';
import SeriesManagePage from './pages/SeriesManagePage';
import { XpNotificationProvider } from './components/XPNotification';

function AppContent() {
  const location = useLocation();
  const isChat = location.pathname === '/chat';
  const isWidePage = isChat || location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <Navbar />
      <div className="flex-1 flex justify-center">
        <div className="flex w-full max-w-[1380px] gap-4 px-3 py-4 sm:px-4 lg:gap-5 xl:gap-6">
          <LeftSidebar />
          <main className={`flex-1 min-w-0 ${isWidePage ? '' : 'max-w-[720px]'}`}>
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
              <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/reading-list" element={<ReadingListPage />} />
              <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/series/manage" element={<ProtectedRoute><SeriesManagePage /></ProtectedRoute>} />
              <Route path="/series/:id" element={<SeriesDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/admin" element={<ProtectedRoute admin><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          {!isWidePage && <RightSidebar />}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <XpNotificationProvider>
        <ConfirmProvider>
          <Router>
            <AppContent />
          </Router>
        </ConfirmProvider>
      </XpNotificationProvider>
    </AuthProvider>
  );
}
