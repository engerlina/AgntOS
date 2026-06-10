import type { ReactNode } from "react";

/** Consistent shell for the Terms / Privacy / Support pages. */
export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {updated ? (
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-faint">
          Last updated {updated}
        </p>
      ) : null}
      {intro ? <p className="mt-5 text-lg">{intro}</p> : null}
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl">{heading}</h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
