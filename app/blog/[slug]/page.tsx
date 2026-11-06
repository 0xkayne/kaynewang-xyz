import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { formatDate, getBlogPost, getBlogPosts, kindLabel } from "@/lib/content";

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "未找到" };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const { default: Content } = await import(`@/content/blog/${post.slug}.mdx`);

  return (
    <PageShell>
      <article>
        <p className="text-sm text-muted">
          {kindLabel(post.category)} · {formatDate(post.date)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{post.description}</p>
        <div className="prose mt-8">
          <Content />
        </div>
        <p className="mt-10 text-sm">
          <Link
            href="/blog"
            className="text-accent underline decoration-line underline-offset-4"
          >
            返回博客
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
