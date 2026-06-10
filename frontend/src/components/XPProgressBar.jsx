import { Cpu, TrendingUp } from 'lucide-react';

export default function XPProgressBar({ xp, level, nextLevelXp, levelProgress, title, compact }) {
  const progress = Math.min(100, Math.max(0, levelProgress || 0));

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-app-text">Lv.{level}</span>
        <div className="flex-1 h-1.5 rounded-full bg-app-bg overflow-hidden">
          <div className="h-full rounded-full bg-app-blue transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-app-subtext">{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-app-bg border border-app-border">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Cpu size={13} className="text-app-blue" />
          <span className="text-xs font-medium text-app-subtext">LEVEL {level}</span>
          <span className="text-xs text-app-text">— {title}</span>
        </div>
        <span className="text-xs font-medium text-app-text">{xp}{nextLevelXp && <span className="text-app-subtext"> / {nextLevelXp} XP</span>}</span>
      </div>
      <div className="h-2 rounded-full bg-white border border-app-border overflow-hidden">
        <div className="h-full rounded-full bg-app-blue transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      {nextLevelXp && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-app-subtext">
          <TrendingUp size={10} />{nextLevelXp - xp} XP to next level
        </div>
      )}
    </div>
  );
}
