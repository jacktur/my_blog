import { useState } from 'react';
import { X, Hash } from 'lucide-react';

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9一-鿿\-_]/g, '');
    if (!tag || tags.includes(tag) || tags.length >= 8) return;
    onChange([...tags, tag]);
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); setInput(''); }
    if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags[tags.length - 1]);
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-app-subtext mb-1.5"><Hash size={13} />标签</label>
      <div className="w-full px-3 py-2 rounded-xl bg-app-bg border border-app-border focus-within:border-app-blue/50 focus-within:ring-2 focus-within:ring-app-blue/10 transition-all flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-app-blue/8 text-app-blue text-xs font-medium">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-app-red transition-colors"><X size={11} /></button>
          </span>
        ))}
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? '输入标签后按 Enter' : ''} maxLength={20}
          className="flex-1 min-w-[100px] bg-transparent text-app-text text-sm placeholder-app-subtext focus:outline-none" />
      </div>
      <p className="text-[10px] text-app-subtext mt-1">Enter 添加，点击 x 删除，最多 8 个</p>
    </div>
  );
}
