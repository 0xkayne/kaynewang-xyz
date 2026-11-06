import Link from "next/link";
import { formatDate, kindLabel, type Update } from "@/lib/labels";

export function EntryList({
  entries,
  emptyLabel = "这里还没有内容。",
}: {
  entries: Update[];
  emptyLabel?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.slug}`}>
          <Link
            href={entry.href}
            className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <span className="text-base text-foreground group-hover:underline group-hover:decoration-line">
              {entry.title}
            </span>
            <span className="shrink-0 text-sm text-muted">
              {kindLabel(entry.kind)} · {formatDate(entry.date)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
