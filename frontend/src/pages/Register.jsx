import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const u = username.trim(); const p = password.trim(); const cp = confirmPassword.trim();
    if (!u || !p || !cp) return setError('请填写所有字段');
    if (u.length < 3) return setError('用户名至少3个字符');
    if (p.length < 6) return setError('密码至少6个字符');
    if (p !== cp) return setError('两次密码不一致');
    setLoading(true);
    try {
      const res = await registerApi(u, p);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) { setError(err.response?.data?.error || '注册失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-app-text">注册</h1>
          <p className="text-app-subtext text-sm mt-1">创建新账号</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <label className="block text-xs font-medium text-app-text mb-1.5">用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm
                placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all"
              placeholder="3-30个字符" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text mb-1.5">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm
                placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all"
              placeholder="至少6个字符" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text mb-1.5">确认密码</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm
                placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all"
              placeholder="再次输入密码" />
          </div>
          {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">
            {loading ? '注册中...' : '注册'}
          </button>
          <p className="text-center text-app-subtext text-xs">
            已有账号？<Link to="/login" className="text-app-blue hover:underline ml-1">登录</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
