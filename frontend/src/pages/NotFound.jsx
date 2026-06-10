import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-app-bg flex items-center justify-center">
        <Compass size={24} className="text-app-blue" />
      </div>
      <h1 className="text-xl font-bold text-app-text">页面不存在</h1>
      <p className="mt-2 text-sm text-app-subtext">这个地址没有对应内容，可能已删除或链接输入有误。</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-app-blue text-white text-sm font-semibold">
          <Home size={15} /> 回首页
        </Link>
        <Link to="/search" className="px-4 py-2 rounded-xl border border-app-border text-app-text text-sm font-semibold hover:bg-app-bg">
          去搜索
        </Link>
      </div>
    </div>
  );
}
