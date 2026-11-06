import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">页面不存在</h1>
      <p className="mt-4 leading-8 text-muted">这个地址没有对应的内容。</p>
      <p className="mt-6 text-sm">
        <Link
          href="/"
          className="text-accent underline decoration-line underline-offset-4"
        >
          回到首页
        </Link>
      </p>
    </PageShell>
  );
}
