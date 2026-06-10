import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AtSign, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { getAuthConfigApi, getGoogleAuthUrl, registerApi, sendRegisterCodeApi } from '../api';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [authConfig, setAuthConfig] = useState({ smtpConfigured: true, googleConfigured: true });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getAuthConfigApi().then(res => setAuthConfig(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const validateEmail = () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('请先填写注册邮箱');
      return null;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('请输入有效邮箱');
      return null;
    }
    return cleanEmail;
  };

  const handleSendCode = async () => {
    setError('');
    setNotice('');
    const cleanEmail = validateEmail();
    if (!cleanEmail) return;

    setSendingCode(true);
    try {
      if (!authConfig.smtpConfigured) throw new Error('SMTP_NOT_CONFIGURED');
      await sendRegisterCodeApi(cleanEmail);
      setNotice('验证码已发送，请查看邮箱');
      setCooldown(60);
    } catch (err) {
      setError(err.message === 'SMTP_NOT_CONFIGURED' ? '邮箱验证码未配置，请联系站长' : (err.response?.data?.error || '验证码发送失败'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const cleanEmail = validateEmail();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanCode = code.trim();
    if (!cleanEmail) return;
    if (!cleanUsername || !cleanPassword || !cleanCode) return setError('请填写所有字段');
    if (cleanUsername.length < 3) return setError('用户名至少 3 个字符');
    if (cleanPassword.length < 6) return setError('密码至少 6 个字符');
    if (!/^\d{6}$/.test(cleanCode)) return setError('请输入 6 位邮箱验证码');

    setLoading(true);
    try {
      const res = await registerApi(cleanEmail, cleanUsername, cleanPassword, cleanCode);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-[480px]">
        <div className="mb-5">
          <p className="text-xs font-semibold text-app-green">创建极客博客账号</p>
          <h1 className="mt-2 text-3xl font-bold text-app-text">注册新账号</h1>
          <p className="mt-2 text-sm leading-6 text-app-subtext">
            用邮箱验证码完成注册，也可以直接使用 Google 继续。
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
            {authConfig.googleConfigured ? '使用 Google 注册 / 登录' : 'Google 登录未配置'}
          </a>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-app-border" />
            <span className="text-xs text-app-subtext">或使用邮箱验证码</span>
            <div className="h-px flex-1 bg-app-border" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text">注册邮箱</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtext" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
                className="h-11 w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-3 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text">用户名</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtext" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                className="h-11 w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-3 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                placeholder="3-30 个字符"
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
                placeholder="至少 6 个字符"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-app-text">验证码</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtext" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="h-11 w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-3 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/50 focus:ring-2 focus:ring-app-blue/10"
                  placeholder="6 位验证码"
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!authConfig.smtpConfigured || sendingCode || cooldown > 0}
                className="h-11 min-w-[112px] rounded-xl border border-app-border bg-white px-3 text-sm font-semibold text-app-text transition-colors hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!authConfig.smtpConfigured ? '未配置' : sendingCode ? '发送中' : cooldown > 0 ? `${cooldown}s` : '发送验证码'}
              </button>
            </div>
          </div>

          {notice && (
            <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-app-green">
              {notice}
            </div>
          )}

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
            {loading ? '注册中...' : '完成注册'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-app-subtext">
            <ShieldCheck className="h-4 w-4 text-app-green" />
            验证码由 2775968902a@gmail.com 发送
          </div>

          <p className="pt-1 text-center text-xs text-app-subtext">
            已有账号？
            <Link to="/login" className="ml-1 font-semibold text-app-blue hover:underline">
              去登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
