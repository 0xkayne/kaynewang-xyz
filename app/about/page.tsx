import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "关于",
  description: "王子平，Kayne，浙江大学在读。这个站用来公开学习和思考。",
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">关于</h1>
        <div className="mt-6 space-y-4 text-base leading-8">
          <p>
            我是王子平，网上更多人认识 Kayne（0xkayne）。目前在浙江大学读研究生，主要时间花在技术学习上，并把学习过程记下来。
          </p>
          <p>
            这个站是个人内容的入口，不是简历主页。笔记放正在学的东西，博客放写完的文章。还没展开的想法也在博客里，用「想法」这个分类标出来。
          </p>
          <p>如果是从 GitHub 或 X 过来的，从首页的最近更新看起就好。</p>
        </div>
        <ul className="mt-8 space-y-2 text-sm">
          <li>
            <a
              href="https://github.com/0xkayne"
              className="text-accent underline decoration-line underline-offset-4"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://x.com/0xKayne"
              className="text-accent underline decoration-line underline-offset-4"
            >
              X / Twitter @0xKayne
            </a>
          </li>
        </ul>
      </article>
    </PageShell>
  );
}
