import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { getAuthConfigApi, getGoogleAuthUrl, loginApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(() => searchParams.get('error') || '');
  const [authConfig, setAuthConfig] = useState({ googleConfigured: true });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getAuthConfigApi().then(res => setAuthConfig(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const id = identifier.trim();
    const pwd = password.trim();
    if (!id || !pwd) return setError('请填写用户名/邮箱和密码');

    setLoading(true);
    try {
      const res = await loginApi(id, pwd);
      login(res.data.user, res.data.token);
      navigate(res.data.user?.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-[460px]">
        <div className="mb-5">
          <p className="text-xs font-semibold text-app-blue">极客博客账号</p>
          <h1 className="mt-2 text-3xl font-bold text-app-text">欢迎回来</h1>
          <p className="mt-2 text-sm leading-6 text-app-subtext">
            使用用户名或邮箱登录，继续管理你的文章、收藏和创作进度。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-app-border bg-white p-5 shadow-card">
          <a
            href={authConfig.googleConfigured ? getGoogleAuthUrl() : undefined}
            onClick={(e) => { if (!authConfig.googleConfigured) e.preventDefault(); }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-white text-sm font-semibold text-app-text transition-colors hover:bg-app-bg"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-app-border text-xs font-bold text-app-blue">
              G
            </span>
            {authConfig.googleConfigured ? '使用 Google 登录' : 'Google 登录未配置'}
          </a>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-app-border" />
            <span className="text-xs text-app-subtext">或使用密码</span>
            <div className="h-px flex-1 bg-app-border" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text">用户名或邮箱</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtext" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                maxLength={80}
                className="h-11 w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-3 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                placeholder="用户名 / 邮箱"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text">密码</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtext" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={100}
                className="h-11 w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-3 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                placeholder="输入密码"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-app-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-app-text text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-app-subtext">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-app-green" />
              JWT 安全会话
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-app-blue" />
              支持邮箱登录
            </div>
          </div>

          <p className="pt-1 text-center text-xs text-app-subtext">
            还没有账号？
            <Link to="/register" className="ml-1 font-semibold text-app-blue hover:underline">
              创建账号
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
