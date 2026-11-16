import type { ReactNode } from "react";

export function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="border-l-2 border-foreground px-4 py-1 text-sm leading-7 text-muted">
      {children}
    </aside>
  );
}
