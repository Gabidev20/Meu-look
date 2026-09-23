import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pt-6 pb-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-block text-sm text-muted">
            ← Voltar
          </Link>
        )}
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
