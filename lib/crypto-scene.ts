// Procedural grayscale fire for the homepage scene.
// Three chapter shapes: interweaving tongues, one central plume, diverging streams.

export type SceneHandle = {
  setChapter: (index: number) => void
  destroy: () => void
}

type Mode = "webgl" | "2d" | "static"

type Bridge = {
  request: (index: number) => void
}

const VERT = "attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}";

const FRAG = [
  "precision mediump float;",
  "varying vec2 vUv;",
  "uniform float uTime;",
  "uniform float uChapter;",
  "uniform float uNudge;",
  "uniform float uWidth;",
  "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
  "float noise(vec2 p){",
  "vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
  "return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}",
  "float fbm(vec2 p){",
  "return noise(p)*0.65+noise(p*2.05+vec2(1.7,9.2))*0.35;}",
  "float band(float x,float center,float halfW){",
  "return 1.0-smoothstep(halfW*0.45,halfW,abs(x-center));}",
  "float flame(vec2 uv,float center,float halfW,float seed){",
  "float y=uv.y;",
  "float rise=uTime*0.7;",
  "vec2 q=vec2((uv.x+seed)*6.0,y*11.0-rise);",
  "float n=fbm(q);",
  "float n2=fbm(q*2.1+vec2(3.0,seed));",
  "float curl=(n-0.5)*halfW*1.3;",
  "float w=halfW*uWidth*(1.05-y*0.62)*(0.75+0.5*n2);",
  "float body=band(uv.x+curl,center,w);",
  "float rip=smoothstep(0.42,0.58,n*0.55+n2*0.45);",
  "float reach=0.55+n*0.42;",
  "float tip=1.0-smoothstep(reach,reach+0.08,y);",
  "float root=smoothstep(0.22,0.0,y);",
  "float heat=body*mix(1.0,rip,smoothstep(0.08,0.35,y))*tip;",
  "heat=max(heat,body*root);",
  "float core=band(uv.x+curl*0.4,center,w*0.38)*tip;",
  "return heat*0.62+core*0.5;",
  "}",
  "void main(){",
  "vec2 uv=vec2(vUv.x+uNudge,vUv.y);",
  "float heat=0.0;",
  "if(uChapter<0.5){",
  "heat=max(flame(uv,0.30,0.13,1.2),flame(uv,0.50,0.11,4.8));",
  "}else if(uChapter<1.5){",
  "heat=flame(uv,0.40,0.09,2.0);",
  "}else{",
  "vec2 left=vec2(uv.x+uv.y*0.14,uv.y);",
  "vec2 right=vec2(uv.x-uv.y*0.14,uv.y);",
  "heat=max(flame(left,0.40,0.08,0.7),flame(right,0.40,0.08,3.6));",
  "}",
  "float luma=clamp(heat,0.0,0.92);",
  "luma*=1.0-smoothstep(0.52,0.8,uv.x)*0.92;",
  "gl_FragColor=vec4(luma,luma,luma,1.0);",
  "}",
].join("");

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function hash2(x: number, y: number, t: number) {
  let n = Math.imul(x + 13, 374761393) ^ Math.imul(y + 29, 668265263) ^ Math.imul(t | 0, 1440662683)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return (n ^ (n >>> 16)) >>> 0
}

export function mountCryptoScene(
  root: HTMLElement,
  glCanvas: HTMLCanvasElement,
  canvas2d: HTMLCanvasElement,
  bridge: Bridge,
): SceneHandle {
  const frames: number[] = []
  const drawTimes: number[] = []
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = motion.matches
  let mode: Mode = "static"
  let gl: WebGLRenderingContext | null = null
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let loc: {
    pos: number
    time: WebGLUniformLocation | null
    chapter: WebGLUniformLocation | null
    nudge: WebGLUniformLocation | null
    width: WebGLUniformLocation | null
  } | null = null
  let width = 2
  let height = 2
  let chapter = 0
  let nudge = 0
  let time = 0
  let raf = 0
  let last = 0
  let inView = true
  let resizeTimer = 0
  let quality = 1
  let adapted = false
  const ctx2d = canvas2d.getContext("2d", { alpha: false })
  let drag: { id: number; x: number; y: number; used: boolean } | null = null
  const fireW = 160
  const fireH = 90
  const cells = new Uint8Array(fireW * fireH)
  const fireImage = ctx2d ? new ImageData(fireW, fireH) : null
  const fireCanvas = document.createElement("canvas")
  fireCanvas.width = fireW
  fireCanvas.height = fireH
  const fireCtx = fireCanvas.getContext("2d", { alpha: false })

  const debug = {
    get frames() {
      return frames.slice()
    },
    get drawTimes() {
      return drawTimes.slice()
    },
    get renderer() {
      return mode
    },
    get running() {
      return raf !== 0
    },
  }
  window.__kayneScene = debug

  function mark(fallback?: string) {
    root.dataset.renderer = mode
    root.dataset.reduced = reduced ? "true" : "false"
    root.dataset.chapter = String(chapter)
    root.dataset.running = raf !== 0 ? "true" : "false"
    if (fallback) root.dataset.fallback = fallback
    else delete root.dataset.fallback
  }

  function drawGl() {
    if (!gl || !program || !buffer || !loc) return
    gl.viewport(0, 0, width, height)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(loc.pos)
    gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1f(loc.time, reduced ? 0.85 : time)
    gl.uniform1f(loc.chapter, chapter)
    gl.uniform1f(loc.nudge, nudge)
    gl.uniform1f(loc.width, width < 700 ? 1.35 : 1)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function seedHeat(x: number) {
    const nx = x / fireW
    const speck = (hash2(x, 4, Math.floor(time * 12)) % 255) / 255
    const band = (center: number, spread: number) => Math.exp(-((nx - center) ** 2) / spread)
    let shape = band(0.4, 0.01)
    if (chapter === 0) shape = Math.max(band(0.3, 0.014), band(0.5, 0.012))
    if (chapter === 2) shape = Math.max(band(0.28, 0.008), band(0.52, 0.008))
    return Math.min(255, (shape * (150 + speck * 105)) | 0)
  }

  function stepFire(steps: number) {
    for (let step = 0; step < steps; step += 1) {
      for (let y = 0; y < fireH - 1; y += 1) {
        const row = y * fireW
        const below = row + fireW
        for (let x = 0; x < fireW; x += 1) {
          const left = cells[below + Math.max(0, x - 1)]
          const mid = cells[below + x]
          const right = cells[below + Math.min(fireW - 1, x + 1)]
          const decay = 1 + (hash2(x, y, step + Math.floor(time * 20)) % 4)
          const value = (left + mid * 2 + right) / 4 - decay
          cells[row + x] = value > 0 ? value : 0
        }
      }
      const base = (fireH - 1) * fireW
      for (let x = 0; x < fireW; x += 1) cells[base + x] = seedHeat(x)
    }
  }

  function draw2d() {
    if (!ctx2d || !fireCtx || !fireImage) return
    if (reduced) {
      cells.fill(0)
      for (let i = 0; i < fireH; i += 1) stepFire(1)
    } else {
      stepFire(2)
    }
    const data = fireImage.data
    for (let i = 0; i < cells.length; i += 1) {
      const value = cells[i]
      const offset = i * 4
      data[offset] = value
      data[offset + 1] = value
      data[offset + 2] = value
      data[offset + 3] = 255
    }
    fireCtx.putImageData(fireImage, 0, 0)
    ctx2d.setTransform(1, 0, 0, 1, 0, 0)
    ctx2d.imageSmoothingEnabled = true
    ctx2d.fillStyle = "#000"
    ctx2d.fillRect(0, 0, width, height)
    ctx2d.drawImage(fireCanvas, 0, 0, width, height)
  }

  function draw() {
    const started = performance.now()
    if (mode === "webgl") drawGl()
    else if (mode === "2d") draw2d()
    drawTimes.push(performance.now() - started)
    if (drawTimes.length > 240) drawTimes.shift()
    if (!adapted && drawTimes.length >= 45 && mode === "webgl") {
      const sorted = drawTimes.slice().sort((a, b) => a - b)
      const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
      if (p95 > 18) {
        adapted = true
        quality = 0.62
        resize()
      }
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
    root.dataset.running = "false"
  }

  function loop(now: number) {
    raf = 0
    if (document.hidden || reduced || !inView) {
      stop()
      return
    }
    if (last) {
      const delta = now - last
      frames.push(delta)
      if (frames.length > 720) frames.shift()
      time += Math.min(0.05, delta / 1000)
    }
    last = now
    draw()
    root.dataset.running = "true"
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (raf || reduced || document.hidden || !inView) return
    last = 0
    raf = requestAnimationFrame(loop)
    root.dataset.running = "true"
  }

  function switchTo2d(reason: string) {
    stop()
    mode = ctx2d ? "2d" : "static"
    gl = null
    mark(reason)
    draw()
    if (!reduced) start()
  }

  function initGl(): boolean {
    try {
      gl = glCanvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      })
    } catch {
      gl = null
    }
    if (!gl) return false
    const vertex = compile(gl, gl.VERTEX_SHADER, VERT)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vertex || !fragment) return false
    program = gl.createProgram()
    if (!program) return false
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false
    buffer = gl.createBuffer()
    if (!buffer) return false
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    loc = {
      pos: gl.getAttribLocation(program, "aPos"),
      time: gl.getUniformLocation(program, "uTime"),
      chapter: gl.getUniformLocation(program, "uChapter"),
      nudge: gl.getUniformLocation(program, "uNudge"),
      width: gl.getUniformLocation(program, "uWidth"),
    }
    return loc.pos >= 0
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    const narrow = rect.width < 800
    const capW = (narrow ? 640 : 1280) * quality
    const capH = (narrow ? 900 : 800) * quality
    let nextW = Math.max(2, Math.round(rect.width))
    let nextH = Math.max(2, Math.round(rect.height))
    const scale = Math.min(1, capW / nextW, capH / nextH)
    nextW = Math.max(2, Math.round(nextW * scale))
    nextH = Math.max(2, Math.round(nextH * scale))
    width = nextW
    height = nextH
    glCanvas.width = width
    glCanvas.height = height
    canvas2d.width = width
    canvas2d.height = height
    draw()
  }

  function setChapter(index: number) {
    chapter = ((index % 3) + 3) % 3
    nudge = 0
    root.dataset.chapter = String(chapter)
    if (width <= 2) resize()
    else draw()
    if (reduced) stop()
    else start()
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target
    if (target instanceof Element && target.closest("a,button,.crypto-copy")) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, used: false }
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.used && Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      drag.used = true
      nudge = 0
      bridge.request(chapter + (dx < 0 ? 1 : -1))
      return
    }
    if (!drag.used) nudge = Math.max(-0.03, Math.min(0.03, dx / Math.max(1, root.clientWidth)))
  }

  function onPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    nudge = 0
  }

  function onVisibility() {
    if (document.hidden || reduced || !inView) stop()
    else start()
  }

  function onMotion() {
    reduced = motion.matches
    root.dataset.reduced = reduced ? "true" : "false"
    if (reduced) {
      stop()
      draw()
    } else start()
  }

  function onLost(event: Event) {
    event.preventDefault()
    switchTo2d("context-lost")
  }

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            inView = entries[0]?.isIntersecting ?? true
            if (!inView || reduced || document.hidden) stop()
            else start()
          },
          { threshold: 0.02 },
        )
      : null

  if (initGl()) {
    mode = "webgl"
    mark()
  } else {
    switchTo2d("no-webgl")
  }
  resize()
  if (reduced) {
    stop()
    draw()
  } else start()
  observer?.observe(root)
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("pointermove", onPointerMove)
  root.addEventListener("pointerup", onPointerUp)
  root.addEventListener("pointercancel", onPointerUp)
  glCanvas.addEventListener("webglcontextlost", onLost)
  function onFreeze() {
    stop()
  }
  function onResume() {
    if (!reduced && inView && !document.hidden) start()
  }
  document.addEventListener("visibilitychange", onVisibility)
  document.addEventListener("freeze", onFreeze)
  document.addEventListener("resume", onResume)
  if (motion.addEventListener) motion.addEventListener("change", onMotion)
  else motion.addListener(onMotion)
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resize, 120)
  }
  window.addEventListener("resize", onResize)

  return {
    setChapter,
    destroy() {
      stop()
      observer?.disconnect()
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerup", onPointerUp)
      root.removeEventListener("pointercancel", onPointerUp)
      glCanvas.removeEventListener("webglcontextlost", onLost)
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("freeze", onFreeze)
      document.removeEventListener("resume", onResume)
      window.removeEventListener("resize", onResize)
      if (motion.removeEventListener) motion.removeEventListener("change", onMotion)
      else motion.removeListener(onMotion)
      window.clearTimeout(resizeTimer)
      if (window.__kayneScene === debug) delete window.__kayneScene
    },
  }
}

declare global {
  interface Window {
    __kayneScene?: {
      readonly frames: number[]
      readonly drawTimes: number[]
      readonly renderer: string
      readonly running: boolean
    }
  }
}
