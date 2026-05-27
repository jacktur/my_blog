import { useState } from 'react';
import { Send } from 'lucide-react';

export default function MessageInput({ onSend, sending }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    onSend(content);
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-3 bg-white">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          maxLength={2000}
          className="flex-1 h-10 px-4 rounded-full bg-gray-100 text-sm text-gray-900
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 text-white
            hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}
