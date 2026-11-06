import type { Metadata } from "next";
import { BlogFilter } from "@/components/blog-filter";
import { PageShell } from "@/components/page-shell";
import { getBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "博客",
  description: "Kayne 的博客。成文放在「博客」，还没展开的短思考标成「想法」。",
};

export default function BlogPage() {
  const entries = getBlogPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    href: `/blog/${post.slug}`,
    kind: post.category,
  }));

  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">博客</h1>
      <p className="mt-4 max-w-2xl leading-8 text-muted">
        写完的文章，和还没展开的想法。想法不是单独的栏目，只在这里用分类区分。
      </p>
      <BlogFilter entries={entries} />
    </PageShell>
  );
}
