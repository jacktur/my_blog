import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAchievementsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Award, ArrowLeft, Loader2, Lock, Check } from 'lucide-react';

const iconMap = { zap: '⚡', layers: '📚', heart: '❤️', flame: '🔥', 'message-circle': '💬', users: '👥', moon: '🌙', book: '📖', bookmark: '🔖', award: '🏆', code: '💻', hash: '#️⃣', trophy: '🏆' };

export default function AchievementsPage() {
  const { isAuthenticated } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isAuthenticated) return; getAchievementsApi().then(r => setAchievements(r.data.achievements)).catch(() => {}).finally(() => setLoading(false)); }, [isAuthenticated]);

  if (!isAuthenticated) return <div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4"><ArrowLeft size={14} /> 返回</Link>
      <div className="flex items-center gap-2 mb-4"><Award size={20} className="text-app-orange" /><h1 className="text-lg font-bold text-app-text">成就</h1><span className="text-app-subtext text-xs">{achievements.filter(a => a.unlocked).length}/{achievements.length}</span></div>
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {!loading && (
        <div className="grid gap-2 sm:grid-cols-2">
          {achievements.map(ach => (
            <div key={ach.id} className={`p-4 rounded-2xl border ${ach.unlocked ? 'bg-white border-app-border' : 'bg-app-bg border-app-border opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${ach.unlocked ? 'bg-app-orange/10' : 'bg-white'}`}>
                  {ach.unlocked ? (iconMap[ach.icon] || '🏆') : <Lock size={14} className="text-app-subtext" />}
                </div>
                <div className="flex-1"><div className="flex items-center gap-1.5"><h3 className={`text-sm font-semibold ${ach.unlocked ? 'text-app-text' : 'text-app-subtext'}`}>{ach.unlocked ? ach.name : '???'}</h3>{ach.unlocked && <Check size={13} className="text-app-green" />}</div><p className="text-xs text-app-subtext mt-0.5">{ach.unlocked ? ach.description : '????'}</p>{ach.unlocked && <p className="text-[10px] text-app-blue font-medium mt-1">+{ach.xp_reward} XP</p>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
