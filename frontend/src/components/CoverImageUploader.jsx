import { useState, useRef } from 'react';
import { Image, Loader2, X } from 'lucide-react';
import { uploadCoverApi } from '../api';

export default function CoverImageUploader({ currentImage, onImageChange }) {
  const [preview, setPreview] = useState(currentImage || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = ev => setPreview(ev.target.result); reader.readAsDataURL(file);
    setUploading(true); setError('');
    try { const r = await uploadCoverApi(file); setPreview(r.data.url); onImageChange(r.data.url); }
    catch (err) { setError(err.response?.data?.error || '上传失败'); setPreview(currentImage || ''); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleRemove = () => { setPreview(''); onImageChange(''); };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-app-subtext mb-1.5"><Image size={13} />封面图</label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-app-border mb-2">
          <img src={preview} alt="" className="w-full h-40 object-cover" />
          <button type="button" onClick={handleRemove} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white hover:bg-app-red/80 transition-colors"><X size={13} /></button>
        </div>
      ) : (
        <div onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 rounded-xl border-2 border-dashed border-app-border flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-app-blue/50 hover:bg-app-blue/5 transition-all mb-2">
          {uploading ? <Loader2 size={20} className="text-app-blue animate-spin" /> : <><Image size={20} className="text-app-subtext" /><span className="text-app-subtext text-xs">点击上传封面图（可选）</span></>}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFile} className="hidden" />
      {error && <p className="text-app-red text-xs">{error}</p>}
    </div>
  );
}
