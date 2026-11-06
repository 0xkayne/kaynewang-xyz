export type BlogCategory = "blog" | "thought";

export type UpdateKind = "note" | BlogCategory;

export type Update = {
  slug: string;
  title: string;
  description: string;
  date: string;
  href: string;
  kind: UpdateKind;
};

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");

  if (!year || !month || !day) {
    return isoDate;
  }

  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function kindLabel(kind: UpdateKind): string {
  if (kind === "note") {
    return "笔记";
  }

  if (kind === "thought") {
    return "想法";
  }

  return "博客";
}
