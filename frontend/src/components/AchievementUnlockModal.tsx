import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Bookmark,
  Code,
  Flame,
  Hash,
  Heart,
  Layers,
  MessageCircle,
  Moon,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

export type AchievementUnlock = {
  id?: number | string;
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  xpReward?: number;
  xp_reward?: number;
  unlockedAt?: string;
  unlocked_at?: string;
  category?: string;
  rarity?: string;
};

type AchievementUnlockModalProps = {
  achievement: AchievementUnlock | null;
  onClose: () => void;
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

function formatUnlockedAt(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AchievementUnlockModal({
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  useEffect(() => {
    if (!achievement) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [achievement, onClose]);

  const Icon = achievement ? iconMap[achievement.icon as keyof typeof iconMap] || Trophy : Trophy;
  const unlockedAt = achievement ? formatUnlockedAt(achievement.unlockedAt || achievement.unlocked_at) : '';
  const xpReward = achievement?.xpReward ?? achievement?.xp_reward ?? 0;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm dark:bg-black/65"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          role="presentation"
        >
          <motion.div
            className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-app-orange/25 bg-white text-app-text shadow-[0_24px_80px_rgba(0,0,0,0.28)] dark:border-app-orange/30 dark:bg-[#19191f] dark:text-white"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-unlock-title"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-app-orange/25 to-transparent" />

            <div className="relative px-6 pb-6 pt-7 text-center">
              <p className="text-sm font-semibold text-app-orange">恭喜解锁新成就！</p>
              <div className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-full border border-app-orange/30 bg-gradient-to-br from-app-yellow/20 via-app-orange/15 to-app-blue/10 shadow-[0_0_34px_rgba(255,149,0,0.34)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 shadow-[0_0_28px_rgba(255,204,0,0.45)] dark:bg-white/10">
                  {achievement.image ? (
                    <img src={achievement.image} alt="" className="h-16 w-16 object-contain drop-shadow-lg" />
                  ) : (
                    <Icon size={42} className="text-app-orange drop-shadow-lg" />
                  )}
                </div>
              </div>

              <h2 id="achievement-unlock-title" className="mt-5 text-2xl font-bold tracking-normal text-app-text dark:text-white">
                {achievement.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-app-subtext dark:text-white/70">
                {achievement.description || '你已达成该成就目标'}
              </p>

              <div className="mt-5 rounded-2xl border border-app-border/80 bg-app-bg/70 px-4 py-3 text-left dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-app-subtext dark:text-white/60">完成时间</span>
                  <span className="font-semibold text-app-text dark:text-white">{unlockedAt}</span>
                </div>
                {xpReward > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-app-subtext dark:text-white/60">奖励</span>
                    <span className="font-semibold text-app-orange">+{xpReward} XP</span>
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm font-medium text-app-text dark:text-white">你已达成该成就目标</p>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-2xl bg-app-blue px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.28)] transition-colors hover:bg-app-blue/90 focus:outline-none focus:ring-2 focus:ring-app-blue focus:ring-offset-2 dark:focus:ring-offset-[#19191f]"
              >
                确定
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
