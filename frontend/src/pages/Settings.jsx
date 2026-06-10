import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePasswordApi, deleteAccountApi, getCurrentUserProfileApi, getGoogleAuthUrl, getSessionsApi, logoutAllApi, revokeSessionApi, unlinkGoogleApi, updateProfileApi } from '../api';
import AvatarPicker from '../components/AvatarPicker';
import { ArrowLeft } from 'lucide-react';
import { useConfirm } from '../components/ConfirmDialog';

export default function Settings() {
  const { user: authUser, isAuthenticated, updateUser, login, logout } = useAuth();
  const confirm = useConfirm();
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (authUser?.id) {
      getCurrentUserProfileApi().then((res) => {
        const p = res.data.user;
        setNickname(p.nickname || p.username || ''); setEmail(p.email || ''); setBirthday((p.birthday || '').slice(0, 10));
        setBio(p.bio || ''); setAvatar(p.avatar || 'default-1');
      }).catch(() => undefined).finally(() => setFetching(false));
    } else Promise.resolve().then(() => setFetching(false));
  }, [authUser?.id]);

  useEffect(() => {
    if (isAuthenticated) getSessionsApi().then(res => setSessions(res.data.sessions || [])).catch(() => undefined);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div className="max-w-lg mx-auto px-4 py-20 text-center"><p className="text-app-red text-sm">请先登录</p><Link to="/login" className="text-app-blue hover:underline mt-4 inline-block">去登录</Link></div>;
  }
  if (fetching) return <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-app-blue/30 border-t-app-blue rounded-full animate-spin" /></div>;

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (bio && bio.length > 200) return setError('签名不能超过200个字符');
    setLoading(true);
    try {
      const payload = {
        nickname,
        email,
        birthday,
        bio,
        avatar: avatar || 'default-1',
      };
      const res = await updateProfileApi(payload);
      if (res.data.user) updateUser({ ...res.data.user, id: authUser.id });
      else updateUser({ ...authUser, nickname: nickname || authUser.username, avatar: avatar || 'default-1' });
      setSuccess('保存成功');
    } catch (err) { setError(err.response?.data?.error || '保存失败'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all";

  const handleChangePassword = async () => {
    setError(''); setSuccess('');
    if (!currentPassword || !newPassword) return setError('请填写当前密码和新密码');
    setSecurityLoading(true);
    try {
      const res = await changePasswordApi({ currentPassword, newPassword });
      login(res.data.user, res.data.token);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('密码已修改，其他设备已退出');
    } catch (err) { setError(err.response?.data?.error || '修改密码失败'); }
    finally { setSecurityLoading(false); }
  };

  const handleLogoutAll = async () => {
    const ok = await confirm({ title: '退出所有设备', message: '确定退出所有设备？当前设备也会回到登录页。', confirmText: '退出', danger: true });
    if (!ok) return;
    setSecurityLoading(true);
    try {
      await logoutAllApi();
      logout();
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || '操作失败'); }
    finally { setSecurityLoading(false); }
  };

  const handleUnlinkGoogle = async () => {
    setSecurityLoading(true);
    try { await unlinkGoogleApi(); setSuccess('Google 已解绑'); }
    catch (err) { setError(err.response?.data?.error || '解绑失败'); }
    finally { setSecurityLoading(false); }
  };

  const handleRevokeSession = async (id) => {
    await revokeSessionApi(id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s));
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({ title: '注销账号', message: '这会永久删除账号和相关内容，确定继续？', confirmText: '注销', danger: true });
    if (!ok) return;
    setDeletePassword('');
    setDeleteDialogOpen(true);
  };

  const submitDeleteAccount = async () => {
    const password = deletePassword.trim();
    if (!password) {
      setError('请输入密码确认注销');
      return;
    }
    setSecurityLoading(true);
    try {
      await deleteAccountApi(password);
      logout();
      navigate('/');
    } catch (err) { setError(err.response?.data?.error || '注销失败'); }
    finally { setSecurityLoading(false); }
  };

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
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          <h3 className="text-sm font-semibold text-app-text">账号安全</h3>
          <div><label className="block text-xs text-app-subtext mb-1">当前密码</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} autoComplete="current-password" /></div>
          <div><label className="block text-xs text-app-subtext mb-1">新密码</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className={inputClass} autoComplete="new-password" /></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleChangePassword} disabled={securityLoading} className="px-4 py-2 rounded-xl bg-app-text text-white text-sm font-semibold disabled:opacity-50">修改密码</button>
            <button type="button" onClick={handleLogoutAll} disabled={securityLoading} className="px-4 py-2 rounded-xl border border-app-border text-app-red text-sm font-semibold hover:bg-red-50 disabled:opacity-50">退出所有设备</button>
            <a href={getGoogleAuthUrl()} className="px-4 py-2 rounded-xl border border-app-border text-app-text text-sm font-semibold hover:bg-app-bg">绑定 Google</a>
            <button type="button" onClick={handleUnlinkGoogle} disabled={securityLoading} className="px-4 py-2 rounded-xl border border-app-border text-app-text text-sm font-semibold hover:bg-app-bg disabled:opacity-50">解绑 Google</button>
            <button type="button" onClick={handleDeleteAccount} disabled={securityLoading} className="px-4 py-2 rounded-xl border border-app-red text-app-red text-sm font-semibold hover:bg-red-50 disabled:opacity-50">注销账号</button>
          </div>
          <div className="pt-3 border-t border-app-border">
            <p className="text-xs font-semibold text-app-text mb-2">最近设备</p>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(session => (
                <div key={session.id} className="flex items-center gap-2 rounded-xl bg-app-bg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-app-text truncate">{session.user_agent || '未知设备'}</p>
                    <p className="text-[10px] text-app-subtext">{session.ip || '-'} · {new Date(`${session.created_at}Z`).toLocaleString('zh-CN')} {session.revoked_at ? '· 已撤销' : ''}</p>
                  </div>
                  {!session.revoked_at && <button type="button" onClick={() => handleRevokeSession(session.id)} className="text-xs text-app-red">撤销</button>}
                </div>
              ))}
              {sessions.length === 0 && <p className="text-xs text-app-subtext">暂无设备记录</p>}
            </div>
          </div>
        </div>
        {success && <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-100"><p className="text-app-green text-xs">{success}</p></div>}
        {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">{loading ? '保存中...' : '保存'}</button>
          <Link to={`/profile/${authUser?.id}`} className="px-6 py-2.5 rounded-xl border border-app-border text-app-subtext text-sm hover:bg-app-bg transition-colors flex items-center">取消</Link>
        </div>
      </form>
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-app-border bg-white p-5 shadow-lg">
            <h3 className="text-base font-bold text-app-text">确认注销账号</h3>
            <p className="mt-2 text-sm leading-6 text-app-subtext">请输入当前密码完成最后确认。</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              className={`${inputClass} mt-4`}
              autoComplete="current-password"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-xl border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-bg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitDeleteAccount}
                disabled={securityLoading || !deletePassword.trim()}
                className="rounded-xl bg-app-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {securityLoading ? '注销中...' : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
