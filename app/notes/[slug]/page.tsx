import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { formatDate, getNote, getNotes } from "@/lib/content";

export function generateStaticParams() {
  return getNotes().map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/notes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);

  if (!note) {
    return { title: "未找到" };
  }

  return {
    title: note.title,
    description: note.description,
  };
}

export default async function NotePage({ params }: PageProps<"/notes/[slug]">) {
  const { slug } = await params;
  const note = getNote(slug);

  if (!note) {
    notFound();
  }

  const { default: Content } = await import(`@/content/notes/${note.slug}.mdx`);

  return (
    <PageShell>
      <article>
        <p className="text-sm text-muted">笔记 · {formatDate(note.date)}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{note.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{note.description}</p>
        <div className="prose mt-8">
          <Content />
        </div>
        <p className="mt-10 text-sm">
          <Link
            href="/notes"
            className="text-accent underline decoration-line underline-offset-4"
          >
            返回笔记
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
