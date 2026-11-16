import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3477";
const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts";

const BASELINE = {
  home: [
    "王子平 · 0xkayne",
    "Kayne",
    "浙江大学在读。这里记下正在学的技术，和还没想完的问题。",
    "最近在写",
    "欢迎来到学习笔记",
    "这个栏目用来记下正在学的东西，允许碎，也允许以后再改。",
    "为什么做这个站",
    "想要一个给社交流量落脚的地方，而不是再做一版简历。",
    "先公开地学，再慢慢写清楚",
    "把没想完的东西放出来，比等一个完整结论更有用。",
    "别处",
    "GitHub",
    "X / Twitter @0xKayne",
    "最近更新",
    "Crypto 与分布式系统",
    "陌生人如何在开放网络中协作，让结果有据可验？我关注比特币与以太坊背后的分布式系统，思考性能、安全与信任之间的取舍。比起概念本身，我更关心设计成立的条件，在这里记录学习与思考。",
  ],
  notes: [
    "笔记",
    "学习过程里的记录。概念、踩坑、还没想清楚的地方，都先放在这里。",
    "欢迎来到学习笔记",
    "还没有笔记。",
  ],
  note: [
    "欢迎来到学习笔记",
    "这个栏目用来记下正在学的东西，允许碎，也允许以后再改。",
    "这里是学习笔记，不是课程总结。",
    "我会把最近在看的技术、踩过的坑、还没想明白的概念写下来。笔记可以短，也可以之后再补。",
    "笔记偏过程，记的是「我正在学什么」",
    "第一篇先占个位置。后面的笔记会从具体问题写起，而不是先列一个空目录。",
    "npm run dev",
    "返回笔记",
  ],
  blog: [
    "博客",
    "写完的文章，和还没展开的想法。想法不是单独的栏目，只在这里用分类区分。",
    "全部",
    "为什么做这个站",
    "先公开地学，再慢慢写清楚",
  ],
  post: [
    "为什么做这个站",
    "想要一个给社交流量落脚的地方，而不是再做一版简历。",
    "社交账号适合抛一句话，不适合把一段学习放下来。",
    "三块内容",
    "域名准备用 kaynewang.xyz。现在先把内容结构跑通，域名以后再接上。",
    "返回博客",
  ],
  thought: [
    "先公开地学，再慢慢写清楚",
    "我不太想等「想清楚了」再写。",
    "先记在这里",
    "这条还没有展开。等下一次真的卡住，再把具体的问题补进来。",
  ],
  about: [
    "余名 Kayne。平居专攻大模型推理仿真——求其迅、求其稳，使智算之器驰于实境而不失其矩。",
    "是站笔录 AI 与 Crypto 之学思：或记所得，或存所惑。辞取简明，义取可循，以便扫读、以便追索。",
    "此乃个人内容之门户，亦流量之落脚。思绪归于此，识面始于此；往来复寻，皆可自兹而入。",
    "https://github.com/0xkayne",
    "https://x.com/0xKayne",
  ],
  missing: ["页面不存在", "这个地址没有对应的内容。", "回到首页"],
};

function lin(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(fg, bg) {
  const luma = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const a = luma(fg);
  const b = luma(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(input) {
  const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "evaluate failed");
    }
    return result.result.value;
  }

  async goto(url) {
    await this.send("Page.enable");
    await this.send("Page.navigate", { url });
    await this.eval("document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))");
    await delay(250);
  }
}

async function openChrome(extraArgs, port) {
  const chrome = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=/tmp/chrome-verify-${port}`,
      ...extraArgs,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 40; i += 1) {
    try {
      const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
      return { chrome, version };
    } catch {
      await delay(150);
    }
  }
  chrome.kill("SIGKILL");
  throw new Error(`Chrome did not start on ${port}`);
}

async function connect(port, url) {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  }).then((response) => response.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  const page = new Page(ws);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.eval("document.fonts.ready");
  await delay(400);
  return { page, ws, target };
}

async function closeTarget(port, target) {
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`, { method: "GET" }).catch(() => {});
}

const failures = [];
function check(name, ok, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!ok) failures.push(line);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await fetch(`${BASE}/`).then((response) => response.status).catch(() => 0);
  if (browser !== 200) throw new Error(`Server not ready at ${BASE} (${browser})`);

  const { chrome, version } = await openChrome([], 9333);
  const report = {
    conditions: {
      browser: version.Browser,
      base: BASE,
      network: "loopback, cache disabled where noted, not a phone network and not production",
      cpu: "host CPU; 4x samples use Chrome Emulation.setCPUThrottlingRate",
      viewports: ["1440x900", "390x844", "360x800", "844x390"],
      inp: "not measured; a synthetic click is not INP",
      lcp: "local loopback only, not an online LCP",
    },
    checks: [],
    performance: {},
  };

  try {
    const { page, ws, target } = await connect(9333, `${BASE}/`);
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.goto(`${BASE}/`);

    const homeText = await page.eval("document.body.innerText");
    for (const text of BASELINE.home) {
      if (text === "还没有笔记。") continue;
      check(`home contains ${text.slice(0, 18)}`, homeText.includes(text));
    }
    const meta = await page.eval(`(() => ({
      title: document.title,
      description: document.querySelector('meta[name=description]')?.content,
      renderer: document.querySelector('#crypto')?.dataset.renderer,
      fallback: document.querySelector('#crypto')?.dataset.fallback || '',
      chapter: document.querySelector('#crypto')?.dataset.chapter,
      touch: getComputedStyle(document.querySelector('#crypto')).touchAction,
      bg: getComputedStyle(document.body).backgroundColor,
      font: getComputedStyle(document.body).fontFamily,
      headerBg: getComputedStyle(document.querySelector('header')).backgroundColor,
    }))()`);
    check("home title Kayne", meta.title === "Kayne", meta.title);
    check("home description", meta.description?.includes("王子平的学习笔记与思考"));
    check("renderer webgl or 2d", meta.renderer === "webgl" || meta.renderer === "2d", meta.renderer);
    check("touch-action pan-y", meta.touch.includes("pan-y"), meta.touch);
    check("body grayscale", meta.bg === "rgb(13, 13, 13)", meta.bg);
    check("serif font", meta.font.includes("Noto Serif SC"), meta.font);
    check("solid header", meta.headerBg === "rgb(13, 13, 13)", meta.headerBg);
    report.home = meta;

    const contrastInfo = await page.eval(`(() => {
      const links = [...document.querySelectorAll('header nav a')].map((a) => ({
        text: a.textContent.trim(),
        color: getComputedStyle(a).color,
        background: getComputedStyle(document.querySelector('header')).backgroundColor,
      }));
      return links;
    })()`);
    for (const link of contrastInfo) {
      const ratio = contrast(parseColor(link.color), parseColor(link.background));
      check(`nav contrast ${link.text}`, ratio >= 4.5, ratio.toFixed(2));
    }

    const heroShot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(`${OUT}/home-desktop-1440.png`, Buffer.from(heroShot.data, "base64"));

    const drag = await page.eval(`(async () => {
      const stage = document.querySelector('#crypto');
      const rect = stage.getBoundingClientRect();
      const x = rect.left + rect.width * 0.25;
      const y = rect.top + rect.height * 0.45;
      const event = (type, cx) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: cx, clientY: y }));
      event('pointerdown', x);
      event('pointermove', x - 120);
      event('pointerup', x - 120);
      await new Promise((resolve) => setTimeout(resolve, 80));
      return stage.dataset.chapter;
    })()`);
    check("drag advances chapter", drag === "1", drag);

    const button = await page.eval(`(async () => {
      document.querySelector('#crypto button[data-chapter="2"]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const stage = document.querySelector('#crypto');
      return { chapter: stage.dataset.chapter, pressed: document.querySelector('#crypto button[data-chapter="2"]').getAttribute('aria-pressed') };
    })()`);
    check("button selects 取舍", button.chapter === "2" && button.pressed === "true", JSON.stringify(button));

    const keys = await page.eval(`(async () => {
      const button = document.querySelector('#crypto button[data-chapter="2"]');
      button.focus();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      return { chapter: document.querySelector('#crypto').dataset.chapter, active: document.activeElement?.textContent?.trim() };
    })()`);
    check("keyboard arrow changes chapter", keys.chapter === "1", JSON.stringify(keys));

    const scroll = await page.eval(`(() => {
      const before = window.scrollY;
      window.scrollTo(0, 700);
      return { before, after: window.scrollY, tall: document.documentElement.scrollHeight > window.innerHeight };
    })()`);
    check("vertical scroll", scroll.after > scroll.before && scroll.tall, JSON.stringify(scroll));

    const overflow = await page.eval("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1");
    check("desktop no horizontal overflow", overflow);

    const belowShot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(`${OUT}/home-desktop-below.png`, Buffer.from(belowShot.data, "base64"));

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await page.goto(`${BASE}/`);
    const mobile = await page.eval(`(() => {
      const body = document.querySelector('#crypto-body').getBoundingClientRect();
      const links = [...document.querySelectorAll('header nav a')].map((a) => ({
        text: a.textContent.trim(),
        color: getComputedStyle(a).color,
        background: getComputedStyle(document.querySelector('header')).backgroundColor,
      }));
      return {
        overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        bodyTop: body.top,
        bodyBottom: body.bottom,
        height: window.innerHeight,
        links,
      };
    })()`);
    check("390 no horizontal overflow", mobile.overflow);
    check("390 body inside stage", mobile.bodyTop >= 0 && mobile.bodyBottom <= mobile.height + 4, JSON.stringify(mobile));
    for (const link of mobile.links) {
      const ratio = contrast(parseColor(link.color), parseColor(link.background));
      check(`390 nav contrast ${link.text}`, ratio >= 4.5, ratio.toFixed(2));
    }
    const mobileShot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(`${OUT}/home-mobile-390.png`, Buffer.from(mobileShot.data, "base64"));

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 360,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await page.goto(`${BASE}/`);
    const narrow = await page.eval(`(() => {
      const body = document.querySelector('#crypto-body').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        visible: body.top >= 0 && body.bottom <= window.innerHeight + 4 && body.width > 120,
      };
    })()`);
    check("360 no horizontal overflow", narrow.overflow);
    check("360 body readable", narrow.visible, JSON.stringify(narrow));

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 844,
      height: 390,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await page.goto(`${BASE}/`);
    const landscape = await page.eval(`(() => {
      const title = document.querySelector('#crypto-title').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        titleVisible: title.width > 40 && title.top < window.innerHeight,
      };
    })()`);
    check("landscape no horizontal overflow", landscape.overflow);
    check("landscape title visible", landscape.titleVisible, JSON.stringify(landscape));
    const landShot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(`${OUT}/home-landscape.png`, Buffer.from(landShot.data, "base64"));

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.send("Network.enable");
    await page.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.send("Performance.enable").catch(() => {});
    await page.goto(`${BASE}/`);
    const cold = await page.eval(`(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name.split('/').slice(-2).join('/'),
        transfer: entry.transferSize,
        encoded: entry.encodedBodySize,
        decoded: entry.decodedBodySize,
      }));
      return {
        dcl: nav?.domContentLoadedEventEnd,
        load: nav?.loadEventEnd,
        transfer: nav?.transferSize,
        encoded: nav?.encodedBodySize,
        resources,
      };
    })()`);
    report.performance.coldDesktopLoopback = cold;
    check("cold document loaded", cold.load > 0, `load ${cold.load}`);

    const motionPair = await page.eval(`(async () => {
      const canvas = [...document.querySelectorAll('#crypto canvas')].find((node) => getComputedStyle(node).display !== 'none');
      const first = canvas ? canvas.toDataURL() : '';
      await new Promise((resolve) => setTimeout(resolve, 500));
      const second = canvas ? canvas.toDataURL() : '';
      return { different: Boolean(first && second && first !== second), running: window.__kayneScene?.running === true };
    })()`);
    check("idle flame keeps moving", motionPair.different && motionPair.running, JSON.stringify(motionPair));

    await page.eval(`(() => {
      document.querySelector('#crypto button[data-chapter="1"]').click();
      return new Promise((resolve) => setTimeout(resolve, 2500));
    })()`);
    const frames = await page.eval("window.__kayneScene ? window.__kayneScene.frames : []");
    const drawTimes = await page.eval("window.__kayneScene ? window.__kayneScene.drawTimes : []");
    const longTasks = await page.eval(`(() => {
      const tasks = performance.getEntriesByType('longtask').map((entry) => entry.duration);
      return tasks;
    })()`).catch(() => []);
    report.performance.desktopFrames = summarize(frames);
    report.performance.drawTimesMs = summarize(drawTimes);
    report.performance.longTasksMs = longTasks;
    check("sustained frame sample", frames.length >= 60, `n=${frames.length}`);

    await page.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.eval(`(() => {
      window.__kayneScene && (window.__before = window.__kayneScene.frames.length);
      document.querySelector('#crypto button[data-chapter="2"]').click();
      return new Promise((resolve) => setTimeout(resolve, 2000));
    })()`);
    const throttled = await page.eval("window.__kayneScene.frames.slice(window.__before || 0)");
    report.performance.desktopFramesCpu4x = summarize(throttled);
    await page.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    const hidden = await page.eval(`(async () => {
      const before = window.__kayneScene ? window.__kayneScene.frames.length : 0;
      document.dispatchEvent(new Event("freeze"));
      await new Promise((resolve) => setTimeout(resolve, 500));
      const during = window.__kayneScene ? window.__kayneScene.frames.length : 0;
      const running = document.querySelector("#crypto")?.dataset.running;
      document.dispatchEvent(new Event("resume"));
      await new Promise((resolve) => setTimeout(resolve, 300));
      const after = window.__kayneScene ? window.__kayneScene.frames.length : 0;
      return { before, during, after, running };
    })()`);
    report.performance.hiddenTab = hidden;
    check(
      "freeze event pauses frames",
      hidden.during === hidden.before && hidden.running !== "true" && hidden.after > hidden.during,
      JSON.stringify(hidden),
    );

    const routes = [
      ["/notes", BASELINE.notes.filter((item) => item !== "还没有笔记。"), "笔记 · Kayne"],
      ["/notes/welcome", BASELINE.note, "欢迎来到学习笔记 · Kayne"],
      ["/blog", BASELINE.blog, "博客 · Kayne"],
      ["/blog/why-this-site", BASELINE.post, "为什么做这个站 · Kayne"],
      ["/blog/learn-out-loud", BASELINE.thought, "先公开地学，再慢慢写清楚 · Kayne"],
      ["/about", BASELINE.about, "关于 · Kayne"],
    ];
    for (const [path, texts, title] of routes) {
      await page.goto(`${BASE}${path}`);
      const text = await page.eval("document.body.innerText");
      const actualTitle = await page.eval("document.title");
      check(`${path} title`, actualTitle === title, actualTitle);
      for (const item of texts) {
      if (path === "/about" && item.startsWith("https://")) {
        const found = await page.eval(`!!document.querySelector('a[href="${item}"]')`);
        check(`${path} links ${item}`, found);
        continue;
      }
      check(`${path} has ${item.slice(0, 16)}`, text.includes(item));
    }
      const wide = await page.eval("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1");
      check(`${path} no overflow`, wide);
    }
    const aboutShot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(`${OUT}/about-desktop.png`, Buffer.from(aboutShot.data, "base64"));

    await page.goto(`${BASE}/blog`);
    const filter = await page.eval(`(async () => {
      const click = (label) => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === label).click();
      const wait = () => new Promise((resolve) => setTimeout(resolve, 60));
      click('想法');
      await wait();
      const thought = document.body.innerText;
      click('博客');
      await wait();
      const blog = document.body.innerText;
      click('全部');
      await wait();
      const all = document.body.innerText;
      return {
        thoughtHasPost: thought.includes('为什么做这个站'),
        thoughtHasThought: thought.includes('先公开地学'),
        blogHasPost: blog.includes('为什么做这个站'),
        blogHasThought: blog.includes('先公开地学'),
        allHasBoth: all.includes('为什么做这个站') && all.includes('先公开地学'),
      };
    })()`);
    check("filter 想法", !filter.thoughtHasPost && filter.thoughtHasThought, JSON.stringify(filter));
    check("filter 博客", filter.blogHasPost && !filter.blogHasThought);
    check("filter 全部", filter.allHasBoth);

    for (const path of ["/missing-route", "/notes/not-a-note"]) {
      let status = 0;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        status = await fetch(`${BASE}${path}`, { redirect: "manual" }).then((response) => response.status);
        if (status === 404) break;
      }
      await page.goto(`${BASE}${path}`);
      const text = await page.eval("document.body.innerText");
      check(`${path} status 404`, status === 404, String(status));
      for (const item of BASELINE.missing) check(`${path} ${item}`, text.includes(item));
    }

    ws.close();
    await closeTarget(9333, target);
  } finally {
    chrome.kill("SIGKILL");
  }

  const reduced = await openChrome([], 9334);
  try {
    const { page, ws, target } = await connect(9334, "about:blank");
    await page.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await page.goto(`${BASE}/`);
    const sample = await page.eval(`(() => {
      const canvas = [...document.querySelectorAll('#crypto canvas')].find((node) => getComputedStyle(node).display !== 'none');
      return { reduced: document.querySelector('#crypto').dataset.reduced, image: canvas ? canvas.toDataURL() : '' };
    })()`);
    await delay(500);
    const second = await page.eval(`(() => {
      const canvas = [...document.querySelectorAll('#crypto canvas')].find((node) => getComputedStyle(node).display !== 'none');
      return canvas ? canvas.toDataURL() : '';
    })()`);
    check("reduced motion flag", sample.reduced === "true", sample.reduced);
    check("reduced motion holds still", sample.image && sample.image === second);
    await page.eval("document.querySelector('a[href=\"/notes\"]').click()");
    await delay(400);
    const notesTitle = await page.eval("document.querySelector('h1')?.textContent");
    check("reduced motion still navigates", notesTitle === "笔记", notesTitle);
    ws.close();
    await closeTarget(9334, target);
  } finally {
    reduced.chrome.kill("SIGKILL");
  }

  const noGl = await openChrome(["--disable-webgl"], 9335);
  try {
    const { page, ws, target } = await connect(9335, `${BASE}/`);
    const state = await page.eval(`(() => ({
      renderer: document.querySelector('#crypto').dataset.renderer,
      fallback: document.querySelector('#crypto').dataset.fallback,
      body: document.querySelector('#crypto-body').textContent,
      nav: !!document.querySelector('header nav'),
    }))()`);
    check("webgl disabled falls back", state.renderer === "2d" && state.fallback === "no-webgl", JSON.stringify(state));
    check("fallback keeps crypto text", state.body.startsWith("陌生人如何在开放网络中协作"));
    check("fallback keeps nav", state.nav);
    await page.goto(`${BASE}/notes`);
    check("fallback can open notes", (await page.eval("document.querySelector('h1')?.textContent")) === "笔记");
    ws.close();
    await closeTarget(9335, target);
  } finally {
    noGl.chrome.kill("SIGKILL");
  }

  const loss = await openChrome([], 9336);
  try {
    const { page, ws, target } = await connect(9336, `${BASE}/`);
    const lost = await page.eval(`(async () => {
      const canvas = document.querySelector('#crypto .crypto-canvas-gl');
      const gl = canvas.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        had: !!gl,
        renderer: document.querySelector('#crypto').dataset.renderer,
        fallback: document.querySelector('#crypto').dataset.fallback,
        body: !!document.querySelector('#crypto-body'),
        nav: !!document.querySelector('header nav'),
      };
    })()`);
    check("context loss falls back", lost.had && lost.renderer === "2d" && lost.fallback === "context-lost", JSON.stringify(lost));
    check("context loss keeps text and nav", lost.body && lost.nav);
    await page.goto(`${BASE}/notes`);
    check("context loss can open notes", (await page.eval("document.querySelector('h1')?.textContent")) === "笔记");
    ws.close();
    await closeTarget(9336, target);
  } finally {
    loss.chrome.kill("SIGKILL");
  }

  report.failures = failures;
  await writeFile(`${OUT}/redesign-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ failures: failures.length, performance: report.performance }, null, 2));
  if (failures.length) process.exit(1);
}

function summarize(frames) {
  const positive = frames.filter((value) => value >= 0 && value < 1000);
  return {
    samples: positive.length,
    p50: percentile(positive, 50),
    p95: percentile(positive, 95),
    max: positive.length ? Math.max(...positive) : null,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
