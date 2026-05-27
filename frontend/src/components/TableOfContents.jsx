import { useState, useEffect, useRef } from 'react';
import { List } from 'lucide-react';

export default function TableOfContents({ contentRef }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!contentRef?.current) return;
    const elements = contentRef.current.querySelectorAll('h2, h3');
    const items = Array.from(elements).map((el, i) => {
      const id = el.id || `heading-${i}`;
      if (!el.id) el.id = id;
      return { id, text: el.textContent || '', level: parseInt(el.tagName[1], 10) };
    });
    setHeadings(items);
    if (observerRef.current) observerRef.current.disconnect();
    const visibleIds = new Set();
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { entry.isIntersecting ? visibleIds.add(entry.target.id) : visibleIds.delete(entry.target.id); });
      const sorted = Array.from(visibleIds).sort((a, b) => (document.getElementById(a)?.getBoundingClientRect().top || 0) - (document.getElementById(b)?.getBoundingClientRect().top || 0));
      if (sorted.length > 0) setActiveId(sorted[0]);
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
    elements.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [contentRef]);

  if (headings.length < 2) return null;

  return (
    <div className="hidden lg:block fixed left-4 top-24 z-30">
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-card border border-app-border text-app-subtext hover:text-app-blue transition-all text-xs">
        <List size={14} />
        {!collapsed && <span>目录</span>}
      </button>
      {!collapsed && (
        <nav className="mt-2 max-h-[60vh] overflow-y-auto rounded-2xl bg-white shadow-card border border-app-border p-3">
          {headings.map((h) => (
            <button key={h.id} onClick={() => { document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveId(h.id); }}
              className={`block w-full text-left py-1 transition-colors ${h.level === 3 ? 'pl-4' : ''} ${
                activeId === h.id
                  ? 'text-app-blue border-l-2 border-app-blue pl-2'
                  : 'text-app-subtext hover:text-app-text border-l-2 border-transparent pl-2'
              }`}
              style={{ fontSize: h.level === 3 ? '12px' : '13px' }}>
              {h.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
