import type { ReactNode } from "react";

export function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm leading-7 text-foreground">
      {children}
    </aside>
  );
}
