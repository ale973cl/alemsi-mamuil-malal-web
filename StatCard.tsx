export default function StatCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    default: 'border-[#DDE5E2] bg-white',
    success: 'border-[#BFE7D0] bg-[#F1FBF5]',
    warning: 'border-[#F1DCA7] bg-[#FFF9EB]',
    danger: 'border-[#EEC7C7] bg-[#FFF5F5]',
  } as const;
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_8px_24px_rgba(14,42,35,.05)] ${tones[tone]}`}>
      <div className="text-xs font-bold uppercase tracking-[.08em] text-[#667572]">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-[#0B2B32]">{value}</div>
      {helper && <div className="mt-1 text-xs text-[#6B7570]">{helper}</div>}
    </div>
  );
}
