import { useState, useEffect, useRef } from 'react';
import { getDefaultAvatarsApi, uploadAvatarApi } from '../api';
import { Upload, Check, Loader2 } from 'lucide-react';

export default function AvatarPicker({ currentAvatar, onAvatarChange }) {
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const [selected, setSelected] = useState(currentAvatar || 'default-1');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { getDefaultAvatarsApi().then(r => setDefaultAvatars(r.data.avatars)).catch(() => {}); }, []);
  useEffect(() => { setSelected(currentAvatar || 'default-1'); }, [currentAvatar]);

  const handleDefaultSelect = (avatarId) => { setSelected(avatarId); setError(''); onAvatarChange(avatarId); };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try { const r = await uploadAvatarApi(file); setSelected(r.data.avatar); onAvatarChange(r.data.avatar); }
    catch (err) { setError(err.response?.data?.error || '上传失败'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const getAvatarUrl = id => { if (!id) return '/uploads/avatars/defaults/default-1.svg'; if (id.startsWith('custom/')) return `/uploads/avatars/${id}`; return `/uploads/avatars/defaults/${id}.svg`; };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-app-border"><img src={getAvatarUrl(selected)} alt="" className="w-full h-full object-cover" /></div>
        <div><p className="text-sm font-semibold text-app-text">当前头像</p><p className="text-xs text-app-subtext">{selected}</p></div>
      </div>
      <div>
        <p className="text-xs text-app-subtext mb-2">选择默认头像</p>
        <div className="grid grid-cols-4 gap-2">
          {defaultAvatars.map(av => (
            <button key={av.id} onClick={() => handleDefaultSelect(av.id)}
              className={`relative w-full aspect-square rounded-xl overflow-hidden ring-2 transition-all ${selected === av.id ? 'ring-app-blue shadow-sm' : 'ring-app-border hover:ring-app-blue/50'}`}>
              <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
              {selected === av.id && <div className="absolute inset-0 bg-app-blue/20 flex items-center justify-center"><Check size={14} className="text-white" /></div>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-app-subtext mb-2">或上传自定义头像</p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUpload} className="hidden" id="avatar-upload" />
        <label htmlFor="avatar-upload" className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-app-border text-app-blue text-sm cursor-pointer hover:bg-app-blue/5 hover:border-app-blue/40 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? '上传中...' : '选择图片上传'}
        </label>
        {error && <p className="text-app-red text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}
