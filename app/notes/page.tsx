import type { Metadata } from "next";
import { EntryList } from "@/components/entry-list";
import { PageShell } from "@/components/page-shell";
import { getNotes } from "@/lib/content";

export const metadata: Metadata = {
  title: "笔记",
  description: "Kayne 的学习笔记。记下正在学的技术，允许碎，也允许以后再改。",
};

export default function NotesPage() {
  const notes = getNotes().map((note) => ({
    ...note,
    href: `/notes/${note.slug}`,
    kind: "note" as const,
  }));

  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">笔记</h1>
      <p className="mt-4 max-w-2xl leading-8 text-muted">
        学习过程里的记录。概念、踩坑、还没想清楚的地方，都先放在这里。
      </p>
      <div className="mt-8">
        <EntryList entries={notes} emptyLabel="还没有笔记。" />
      </div>
    </PageShell>
  );
}
