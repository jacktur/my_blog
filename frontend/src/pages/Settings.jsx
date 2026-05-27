import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi, getUserProfileApi } from '../api';
import AvatarPicker from '../components/AvatarPicker';
import { ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { user: authUser, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('default-1');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authUser?.id) {
      getUserProfileApi(authUser.id).then((res) => {
        const p = res.data.user;
        setNickname(p.nickname || ''); setEmail(p.email || ''); setBirthday(p.birthday || '');
        setBio(p.bio || ''); setAvatar(p.avatar || 'default-1');
      }).catch(() => {}).finally(() => setFetching(false));
    } else setFetching(false);
  }, [authUser?.id]);

  if (!isAuthenticated) {
    return <div className="max-w-lg mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;
  }
  if (fetching) return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>;

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (bio && bio.length > 200) return setError('签名不能超过200个字符');
    setLoading(true);
    try {
      const payload = {}; if (nickname) payload.nickname = nickname; if (email) payload.email = email;
      if (birthday) payload.birthday = birthday; if (bio) payload.bio = bio; if (avatar) payload.avatar = avatar;
      const res = await updateProfileApi(payload);
      if (res.data.user) updateUser({ ...res.data.user, id: authUser.id });
      else updateUser({ ...authUser, nickname: nickname || authUser.username, avatar: avatar || 'default-1' });
      setSuccess('保存成功');
    } catch (err) { setError(err.response?.data?.error || '保存失败'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/profile/${authUser?.id}`} className="inline-flex items-center gap-1.5 text-app-subtext hover:text-app-blue transition-colors text-sm">
          <ArrowLeft size={14} /> 返回
        </Link>
        <h2 className="text-lg font-bold text-app-text">设置</h2>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-app-text mb-3">头像</h3>
          <AvatarPicker currentAvatar={avatar} onAvatarChange={setAvatar} />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <h3 className="text-sm font-semibold text-app-text">个人资料</h3>
          <div><label className="block text-xs text-app-subtext mb-1">昵称</label><input type="text" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={30} className={inputClass} placeholder="设置昵称" /></div>
          <div><label className="block text-xs text-app-subtext mb-1">邮箱</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={100} className={inputClass} placeholder="example@email.com" /></div>
          <div><label className="block text-xs text-app-subtext mb-1">生日</label><input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={inputClass} /></div>
          <div><label className="block text-xs text-app-subtext mb-1">签名 <span className="text-app-subtext/60">({bio.length}/200)</span></label><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={2} className={inputClass + " resize-none"} placeholder="一句话介绍..." /></div>
        </div>
        {success && <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-100"><p className="text-app-green text-xs">{success}</p></div>}
        {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">{loading ? '保存中...' : '保存'}</button>
          <Link to={`/profile/${authUser?.id}`} className="px-6 py-2.5 rounded-xl border border-app-border text-app-subtext text-sm hover:bg-app-bg transition-colors flex items-center">取消</Link>
        </div>
      </form>
    </div>
  );
}
