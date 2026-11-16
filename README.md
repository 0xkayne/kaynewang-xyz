# kaynewang.xyz

Kayne（王子平 / 0xkayne）的个人站点。首页、学习笔记、博客和关于页。技术栈是 Next.js（App Router）、MDX 和 Tailwind CSS。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000 。

```bash
npm run lint
npm run build
npm start
```

站点起来之后，可以用 `BASE_URL=http://127.0.0.1:3000 node scripts/verify-redesign.mjs` 复查路由、原文、场景切换和本机性能。这不是线上指标。

## 内容

- 学习笔记：`content/notes/*.mdx`
- 博客和想法：`content/blog/*.mdx`

博客文件的 frontmatter 需要 `category`，取值是 `blog` 或 `thought`。想法不是单独的路由，在 `/blog` 里用分类筛选。

## 部署

这个仓库可以部署到 Vercel。生产域名是 kaynewang.xyz。改样式或内容时不要在这个仓库里改 DNS、证书或部署配置。

正文字体是自托管的 Noto Serif SC（Regular / Bold 子集），许可为 SIL Open Font License 1.1，见 `public/fonts/OFL.txt`。首页场景是原创几何剪影，不是第三方插画的复刻。
