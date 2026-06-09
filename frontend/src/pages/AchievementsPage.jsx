import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAchievementsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useXpNotification } from '../components/XPNotification';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Bookmark,
  Check,
  Code,
  Flame,
  Hash,
  Heart,
  Layers,
  Loader2,
  Lock,
  MessageCircle,
  Moon,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const categoryLabels = {
  all: '全部',
  writing: '写作',
  reading: '阅读',
  social: '社交',
  collection: '收藏',
  streak: '连续',
};

const rarityLabels = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  secret: '隐藏',
};

const rarityStyles = {
  common: 'bg-app-blue/10 text-app-blue border-app-blue/20',
  rare: 'bg-app-green/10 text-app-green border-app-green/20',
  epic: 'bg-app-purple/10 text-app-purple border-app-purple/20',
  secret: 'bg-app-text/10 text-app-text border-app-border',
};

const iconMap = {
  award: Award,
  book: BookOpen,
  bookmark: Bookmark,
  code: Code,
  flame: Flame,
  hash: Hash,
  heart: Heart,
  layers: Layers,
  'message-circle': MessageCircle,
  moon: Moon,
  trophy: Trophy,
  users: Users,
  zap: Zap,
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AchievementCard({ achievement }) {
  const unlocked = achievement.unlocked;
  const progress = achievement.progress || {};
  const percent = unlocked ? 100 : Math.min(100, Math.max(0, progress.percent || 0));
  const Icon = unlocked ? (iconMap[achievement.icon] || Trophy) : Lock;
  const isHiddenLocked = achievement.hidden && !unlocked;
  const title = isHiddenLocked ? '隐藏信号' : achievement.name;
  const description = isHiddenLocked ? '保持探索，触发后会显示完整信息' : achievement.description;
  const xpReward = achievement.xpReward ?? achievement.xp_reward ?? 0;
  const rarity = achievement.rarity || 'common';

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-card transition-colors ${unlocked ? 'border-app-border' : 'border-app-border opacity-80'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${unlocked ? 'bg-app-orange/10 text-app-orange' : 'bg-app-bg text-app-subtext'}`}>
          {achievement.image && !isHiddenLocked ? (
            <img
              src={achievement.image}
              alt=""
              className={`h-10 w-10 object-contain ${unlocked ? '' : 'grayscale opacity-60'}`}
            />
          ) : (
            <Icon size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`truncate text-sm font-semibold ${unlocked ? 'text-app-text' : 'text-app-subtext'}`}>
                {title}
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-app-subtext">{description}</p>
            </div>
            {unlocked && <Check size={15} className="mt-0.5 shrink-0 text-app-green" />}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${rarityStyles[rarity] || rarityStyles.common}`}>
              {rarityLabels[rarity] || rarityLabels.common}
            </span>
            <span className="rounded-full border border-app-orange/20 bg-app-orange/10 px-2 py-0.5 text-[10px] font-medium text-app-orange">
              +{xpReward} XP
            </span>
            {unlocked && achievement.unlockedAt && (
              <span className="text-[10px] text-app-subtext">{formatDate(achievement.unlockedAt)}</span>
            )}
          </div>

          {!unlocked && !isHiddenLocked && progress.target > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-app-subtext">
                <span>进度</span>
                <span>{progress.label || `${progress.current || 0}/${progress.target}`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
                <div className="h-full rounded-full bg-app-blue transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const { isAuthenticated } = useAuth();
  const { notifyGamification } = useXpNotification();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getAchievementsApi()
      .then(r => {
        setAchievements(r.data.achievements || []);
        if (r.data.newlyUnlocked?.length) {
          notifyGamification({ achievements: r.data.newlyUnlocked });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, notifyGamification]);

  const visibleCategories = useMemo(() => {
    const categories = new Set(achievements.map(a => a.category).filter(Boolean));
    return ['all', ...Object.keys(categoryLabels).filter(c => c !== 'all' && categories.has(c))];
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return achievements;
    return achievements.filter(a => a.category === activeCategory);
  }, [achievements, activeCategory]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completion = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-sm text-app-red">请先登录</p>
        <Link to="/login" className="mt-4 inline-block text-app-blue hover:underline">去登录</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-app-subtext transition-colors hover:text-app-blue">
        <ArrowLeft size={14} /> 返回
      </Link>

      <div className="mb-4 rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award size={20} className="text-app-orange" />
              <h1 className="text-lg font-bold text-app-text">成就</h1>
            </div>
            <p className="mt-1 text-xs text-app-subtext">已解锁 {unlockedCount}/{totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-app-blue">{completion}%</p>
            <p className="text-[10px] text-app-subtext">完成度</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-app-bg">
          <div className="h-full rounded-full bg-app-blue transition-all duration-700" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {visibleCategories.map(category => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === category
                ? 'border-app-blue bg-app-blue text-white'
                : 'border-app-border bg-white text-app-subtext hover:text-app-blue'
            }`}
          >
            {categoryLabels[category] || category}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-app-blue" /></div>}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredAchievements.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
}
