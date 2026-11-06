import Link from "next/link";
import { EntryList } from "@/components/entry-list";
import { PageShell } from "@/components/page-shell";
import { formatDate, getFeatured, getUpdates, kindLabel } from "@/lib/content";

const socialLinks = [
  { href: "https://github.com/0xkayne", label: "GitHub" },
  { href: "https://x.com/0xKayne", label: "X / Twitter @0xKayne" },
];

export default function HomePage() {
  const featured = getFeatured();
  const updates = getUpdates();

  return (
    <PageShell>
      <p className="text-sm text-muted">王子平 · 0xkayne</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Kayne</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
        浙江大学在读。这里记下正在学的技术，和还没想完的问题。
      </p>

      <section className="mt-10" aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="text-sm font-medium text-muted">
          最近在写
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {featured.map((item) => (
            <li key={`${item.kind}-${item.slug}`}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:border-accent"
              >
                <span className="text-xs text-muted">
                  {kindLabel(item.kind)} · {formatDate(item.date)}
                </span>
                <span className="mt-3 text-base font-medium leading-6">
                  {item.title}
                </span>
                <span className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="social-heading">
        <h2 id="social-heading" className="text-sm font-medium text-muted">
          别处
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-5">
          {socialLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-accent underline decoration-line underline-offset-4"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="updates-heading">
        <h2 id="updates-heading" className="text-sm font-medium text-muted">
          最近更新
        </h2>
        <div className="mt-3">
          <EntryList entries={updates} />
        </div>
      </section>
    </PageShell>
  );
}
