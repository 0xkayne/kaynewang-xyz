"use client";

import { useState } from "react";
import { EntryList } from "@/components/entry-list";
import { kindLabel, type BlogCategory, type Update } from "@/lib/labels";

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "blog", label: "博客" },
  { id: "thought", label: "想法" },
] as const;

type FilterId = "all" | BlogCategory;

export function BlogFilter({ entries }: { entries: Update[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const visible =
    filter === "all" ? entries : entries.filter((entry) => entry.kind === filter);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-sm" role="group" aria-label="按分类筛选">
        {FILTERS.map((item) => {
          const active = filter === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.id)}
              className={`inline-flex rounded-full border px-3 py-1.5 ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-line bg-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        <EntryList
          entries={visible}
          emptyLabel={
            filter === "all" ? "还没有文章。" : `还没有标成「${kindLabel(filter)}」的文章。`
          }
        />
      </div>
    </>
  );
}
