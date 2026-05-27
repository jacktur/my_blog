import { FileText, MessageSquare, Heart, Award, Zap, UserPlus, Bookmark, Activity } from 'lucide-react';

const activityConfig = {
  publish_article: { icon: FileText, color: 'text-app-blue', label: '发布文章' },
  comment: { icon: MessageSquare, color: 'text-app-blue', label: '评论' },
  like_received: { icon: Heart, color: 'text-app-red', label: '获赞' },
  achievement: { icon: Award, color: 'text-app-orange', label: '成就' },
  level_up: { icon: Zap, color: 'text-app-purple', label: '升级' },
  follow: { icon: UserPlus, color: 'text-app-green', label: '关注' },
  bookmark: { icon: Bookmark, color: 'text-app-orange', label: '收藏' },
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return <div className="flex flex-col items-center py-6 text-app-subtext"><Activity size={20} className="mb-1.5 opacity-20" /><p className="text-xs">暂无动态</p></div>;
  }

  return (
    <div className="space-y-1">
      {activities.map((act, i) => {
        const cfg = activityConfig[act.activity_type] || { icon: Activity, color: 'text-app-subtext' };
        const Icon = cfg.icon;
        return (
          <div key={act.id || i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-app-bg transition-colors">
            <div className={cfg.color}><Icon size={13} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-app-text">{act.description}</p>
              <p className="text-[10px] text-app-subtext mt-0.5">{formatTime(act.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
