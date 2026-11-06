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
            余名 Kayne。平居专攻大模型推理仿真——求其迅、求其稳，使智算之器驰于实境而不失其矩。
          </p>
          <p>
            是站笔录 AI 与 Crypto 之学思：或记所得，或存所惑。辞取简明，义取可循，以便扫读、以便追索。
          </p>
          <p>
            此乃个人内容之门户，亦流量之落脚。思绪归于此，识面始于此；往来复寻，皆可自兹而入。
          </p>
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
