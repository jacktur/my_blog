import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Image, Link2, PenLine } from 'lucide-react';

export default function PublisherBox() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  return (
    <div className="card p-4 mb-3">
      <button
        onClick={() => navigate('/create')}
        className="w-full text-left flex items-center gap-3 text-app-subtext hover:text-app-text transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-app-bg flex items-center justify-center">
          <PenLine size={16} className="text-app-blue" />
        </div>
        <span className="text-sm">有什么新鲜事想分享给大家？</span>
      </button>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-app-subtext hover:bg-app-bg hover:text-app-blue transition-colors">
            <Image size={15} />
            <span>图片</span>
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-app-subtext hover:bg-app-bg hover:text-app-blue transition-colors">
            <Link2 size={15} />
            <span>链接</span>
          </button>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-app-blue text-white text-xs font-medium hover:bg-app-blue/90 transition-colors"
        >
          <PenLine size={13} />
          发布文章
        </button>
      </div>
    </div>
  );
}
