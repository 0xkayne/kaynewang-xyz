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

## 内容

- 学习笔记：`content/notes/*.mdx`
- 博客和想法：`content/blog/*.mdx`

博客文件的 frontmatter 需要 `category`，取值是 `blog` 或 `thought`。想法不是单独的路由，在 `/blog` 里用分类筛选。

## 部署

这个仓库可以部署到 Vercel。生产域名计划使用 kaynewang.xyz，域名和 DNS 还没有在这里配置。
