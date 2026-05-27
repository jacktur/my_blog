import { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';

export default function EnhancedCodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-app-border bg-[#F9F9FB]">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-app-border">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-app-subtext hover:text-app-text transition-colors">
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          {language && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-app-bg text-app-subtext uppercase">
              {language}
            </span>
          )}
          <span className="text-[10px] text-app-subtext">{lines.length} lines</span>
        </div>
        <button onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-app-subtext hover:text-app-blue hover:bg-app-blue/5 transition-all">
          {copied ? <><Check size={12} className="text-app-green" /><span className="text-app-green">COPIED</span></>
            : <><Copy size={12} /><span>COPY</span></>}
        </button>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-app-bg/50">
                  <td className="select-none text-right px-3 py-0 text-[11px] leading-6 text-app-subtext/40 border-r border-app-border font-mono align-top"
                    style={{ minWidth: '3rem' }}>{i + 1}</td>
                  <td className="px-4 py-0 leading-6"><code className="text-sm font-mono text-app-text">{line || ' '}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
