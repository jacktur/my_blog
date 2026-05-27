import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Trophy, ArrowLeft, Loader2 } from 'lucide-react';

export default function LeaderboardPage() {
  const { user: authUser } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getLeaderboardApi().then(r => setLeaders(r.data.leaderboard)).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm mb-4"><ArrowLeft size={14} /> 返回</Link>
      <div className="flex items-center gap-2 mb-4"><Trophy size={20} className="text-app-orange" /><h1 className="text-lg font-bold text-app-text">排行榜</h1></div>
      {loading && <div className="flex justify-center py-12"><Loader2 size={18} className="text-app-blue animate-spin" /></div>}
      {!loading && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-card">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-app-bg text-xs text-app-subtext font-medium border-b border-app-border"> <div className="col-span-1">#</div><div className="col-span-6">用户</div><div className="col-span-2 text-right">等级</div><div className="col-span-3 text-right">XP</div></div>
          {leaders.map(l => { const isMe = authUser?.id === l.id; return (
            <Link key={l.id} to={`/profile/${l.id}`}
              className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-app-border last:border-0 hover:bg-app-bg transition-colors ${isMe ? 'bg-app-blue/5' : ''}`}>
              <div className="col-span-1 flex items-center"><span className="text-app-subtext text-xs font-medium">{l.rank}</span></div>
              <div className="col-span-6 flex items-center gap-2 min-w-0"><span className="text-app-text font-medium truncate">{l.username}</span>{isMe && <span className="px-1.5 py-0.5 rounded text-[10px] bg-app-blue/10 text-app-blue font-medium">你</span>}</div>
              <div className="col-span-2 text-right flex items-center justify-end"><span className="text-app-subtext text-xs">Lv.{l.level}</span></div>
              <div className="col-span-3 text-right flex items-center justify-end"><span className="text-app-orange font-medium text-xs">{l.xp} XP</span></div>
            </Link>
          );})}
        </div>
      )}
    </div>
  );
}
