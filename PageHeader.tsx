export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-extrabold tracking-[.18em] text-[#169B62]">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B2B32] md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5E6D6B]">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </section>
  );
}
