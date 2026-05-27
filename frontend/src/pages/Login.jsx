import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!username.trim() || !password.trim()) return setError('请填写所有字段');
    setLoading(true);
    try {
      const res = await loginApi(username.trim(), password.trim());
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) { setError(err.response?.data?.error || '登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-app-text">登录</h1>
          <p className="text-app-subtext text-sm mt-1">欢迎回来</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <label className="block text-xs font-medium text-app-text mb-1.5">用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm
                placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all"
              placeholder="输入用户名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text mb-1.5">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-app-bg border border-app-border text-app-text text-sm
                placeholder-app-subtext focus:outline-none focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10 transition-all"
              placeholder="输入密码" />
          </div>
          {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100"><p className="text-app-red text-xs">{error}</p></div>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-app-blue text-white font-semibold text-sm hover:bg-app-blue/90 disabled:opacity-50 transition-colors">
            {loading ? '登录中...' : '登录'}
          </button>
          <p className="text-center text-app-subtext text-xs">
            没有账号？<Link to="/register" className="text-app-blue hover:underline ml-1">注册</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
