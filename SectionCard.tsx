export default function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-[#DDE5E2] bg-white p-4 shadow-[0_12px_32px_rgba(14,42,35,.06)] md:p-5 ${className}`}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title && <h2 className="text-lg font-black text-[#0B2B32] md:text-xl">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-[#667572]">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
