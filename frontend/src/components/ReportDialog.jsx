import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const REPORT_REASONS = [
  '色情低俗',
  '违法违规',
  '政治敏感',
  '不实信息',
  '违规营销',
  '危害人身安全',
  '未成年相关',
  '侵犯权益',
  '其他',
];

export default function ReportDialog({ open, title = '提交举报', submitting = false, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <ReportDialogForm
      title={title}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function ReportDialogForm({ title, submitting, onClose, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [details, setDetails] = useState('');

  const toggleReason = (reason) => {
    setSelected((prev) =>
      prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selected.length === 0 || submitting) return;
    onSubmit({ reason: selected.join('、'), details: details.trim() });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-app-border bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-app-orange/10 text-app-orange">
              <AlertTriangle size={18} />
            </div>
            <h2 className="text-base font-bold text-app-text">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-app-subtext">选择违规类型，可补充更多说明。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-app-subtext transition-colors hover:bg-app-bg hover:text-app-text"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_REASONS.map((reason) => {
            const checked = selected.includes(reason);
            return (
              <label
                key={reason}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors
                  ${checked ? 'border-app-blue bg-app-blue/8 text-app-blue' : 'border-app-border text-app-text hover:bg-app-bg'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleReason(reason)}
                  className="h-4 w-4 accent-app-blue"
                />
                <span>{reason}</span>
              </label>
            );
          })}
        </div>

        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value.slice(0, 500))}
          placeholder="补充举报内容（可选）"
          rows={4}
          className="mt-4 w-full resize-none rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text outline-none transition-all placeholder:text-app-subtext focus:border-app-blue/40 focus:ring-2 focus:ring-app-blue/10"
        />
        <div className="mt-1 text-right text-xs text-app-subtext">{details.length}/500</div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-app-border px-4 py-2 text-sm text-app-text transition-colors hover:bg-app-bg"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={selected.length === 0 || submitting}
            className="rounded-xl bg-app-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? '提交中' : '提交举报'}
          </button>
        </div>
      </form>
    </div>
  );
}
