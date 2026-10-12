export const MODERATION_LABELS = { published: '已发布', pending: '待审核', held: '暂缓发布', rejected: '未通过' };

export default function ModerationEvidence({ moderation, status }) {
  if (!moderation) return null;
  return (
    <div className="my-3 border-l-4 border-app-orange bg-app-bg px-3 py-2 text-sm break-words">
      <p className="font-semibold text-app-text">{MODERATION_LABELS[status]} · 风险分值 {Math.round(moderation.score * 100)} / 100</p>
      {moderation.review && <p className="mt-1 text-app-subtext">复核意见：{moderation.review.reason}</p>}
      {(moderation.evidence || []).map((item, index) => (
        <details key={`${item.field}-${item.start}`} className="mt-2">
          <summary className="cursor-pointer text-app-subtext">片段 {index + 1} · {{ title: '标题', content: '正文', tags: '标签' }[item.field]} · {item.reasons.join('；')}</summary>
          <blockquote className="mt-2 whitespace-pre-wrap text-app-text">{item.text}</blockquote>
        </details>
      ))}
    </div>
  );
}
