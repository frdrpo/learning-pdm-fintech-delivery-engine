export type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mx-auto w-full max-w-5xl px-6 pt-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}