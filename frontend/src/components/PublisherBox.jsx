import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Image, Link2, PenLine } from 'lucide-react';

export default function PublisherBox() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  return (
    <div className="mb-3 rounded-xl border border-app-border bg-app-card p-3 shadow-card sm:p-4">
      <button
        onClick={() => navigate('/create')}
        className="flex w-full items-center gap-3 rounded-lg bg-app-bg px-3 py-3 text-left text-app-subtext transition-colors hover:text-app-text"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-card ring-1 ring-app-border">
          <PenLine size={16} className="text-app-blue" />
        </div>
        <span className="text-sm">写下新的技术笔记、项目记录或想法</span>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/create?quick=image')} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs text-app-subtext transition-colors hover:bg-app-bg hover:text-app-blue">
            <Image size={15} />
            <span>图片</span>
          </button>
          <button onClick={() => navigate('/create?quick=link')} className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs text-app-subtext transition-colors hover:bg-app-bg hover:text-app-blue">
            <Link2 size={15} />
            <span>链接</span>
          </button>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex h-8 items-center gap-1 rounded-lg bg-app-blue px-4 text-xs font-medium text-white transition-colors hover:bg-app-blue/90"
        >
          <PenLine size={13} />
          发布文章
        </button>
      </div>
    </div>
  );
}
