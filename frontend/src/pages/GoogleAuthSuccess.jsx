import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GoogleAuthSuccess() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  const authResult = useMemo(() => {
    const token = searchParams.get('token');
    const userText = searchParams.get('user');

    if (!token || !userText) {
      return { error: 'Google 登录返回信息不完整' };
    }

    try {
      const user = JSON.parse(userText);
      return { token, user };
    } catch {
      return { error: 'Google 登录信息解析失败' };
    }
  }, [searchParams]);

  useEffect(() => {
    if (authResult.token && authResult.user) {
      login(authResult.user, authResult.token);
      navigate('/', { replace: true });
    }
  }, [authResult, login, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-app-border bg-white p-6 text-center shadow-card">
        {!authResult.error ? (
          <>
            <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-app-blue" />
            <h1 className="mt-4 text-lg font-semibold text-app-text">正在完成 Google 登录</h1>
            <p className="mt-2 text-sm text-app-subtext">请稍等，马上返回首页。</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-app-text">Google 登录失败</h1>
            <p className="mt-2 text-sm text-app-red">{authResult.error}</p>
            <Link
              to="/login"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-app-text px-4 text-sm font-semibold text-white"
            >
              返回登录
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
