import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { BlogCategory, Update } from "@/lib/labels";

export type { BlogCategory, Update, UpdateKind } from "@/lib/labels";
export { formatDate, kindLabel } from "@/lib/labels";

const NOTES_DIR = path.join(process.cwd(), "content", "notes");
const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Note = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type BlogPost = Note & {
  category: BlogCategory;
};

type Frontmatter = {
  title?: unknown;
  description?: unknown;
  date?: unknown;
  category?: unknown;
};

function normalizeDate(value: unknown, file: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  throw new Error(`${file} 缺少有效的 date，格式应为 YYYY-MM-DD`);
}

function requireText(value: unknown, file: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${file} 缺少 frontmatter 字段 ${field}`);
  }

  return value.trim();
}

function readMdxFiles(dir: string): { slug: string; data: Frontmatter; file: string }[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.slice(0, -".mdx".length);

      if (!SLUG_PATTERN.test(slug)) {
        throw new Error(`${file} 的文件名只能使用小写字母、数字和连字符`);
      }

      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);

      return { slug, data: data as Frontmatter, file };
    });
}

function parseCategory(value: unknown, file: string): BlogCategory {
  if (value === "blog" || value === "thought") {
    return value;
  }

  throw new Error(`${file} 的 category 只能是 blog 或 thought`);
}

function toEntry(file: string, slug: string, data: Frontmatter): Note {
  return {
    slug,
    title: requireText(data.title, file, "title"),
    description: requireText(data.description, file, "description"),
    date: normalizeDate(data.date, file),
  };
}

function byDateDesc(a: { date: string; title: string }, b: { date: string; title: string }) {
  if (a.date === b.date) {
    return a.title.localeCompare(b.title, "zh-CN");
  }

  return a.date < b.date ? 1 : -1;
}

export function getNotes(): Note[] {
  return readMdxFiles(NOTES_DIR)
    .map(({ slug, data, file }) => toEntry(file, slug, data))
    .sort(byDateDesc);
}

export function getNote(slug: string): Note | undefined {
  return getNotes().find((note) => note.slug === slug);
}

export function getBlogPosts(): BlogPost[] {
  return readMdxFiles(BLOG_DIR)
    .map(({ slug, data, file }) => ({
      ...toEntry(file, slug, data),
      category: parseCategory(data.category, file),
    }))
    .sort(byDateDesc);
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}

export function getUpdates(): Update[] {
  const notes: Update[] = getNotes().map((note) => ({
    ...note,
    href: `/notes/${note.slug}`,
    kind: "note",
  }));

  const posts: Update[] = getBlogPosts().map((post) => ({
    ...post,
    href: `/blog/${post.slug}`,
    kind: post.category,
  }));

  return [...notes, ...posts].sort(byDateDesc);
}

export function getFeatured(): Update[] {
  const updates = getUpdates();
  const note = updates.find((item) => item.kind === "note");
  const blog = updates.find((item) => item.kind === "blog");
  const thought = updates.find((item) => item.kind === "thought");

  return [note, blog, thought].filter((item): item is Update => item !== undefined);
}
