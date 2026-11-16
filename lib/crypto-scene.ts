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
  "float lick(vec2 uv,float center,float width,float height,float rise,float curl,float seed){",
  "float n=noise(vec2(seed*1.7,uv.y*3.2-uTime*rise));",
  "float n2=noise(vec2(seed+uv.x*2.0,uv.y*7.5-uTime*rise*1.35));",
  "float x=uv.x-center-(n-0.5)*width*curl;",
  "float h=height*(0.58+0.42*n2);",
  "float taper=width*uWidth*pow(max(0.001,1.0-uv.y/h),0.55);",
  "float d=abs(x);",
  "float body=1.0-smoothstep(taper*0.22,taper,d);",
  "float core=1.0-smoothstep(0.0,taper*0.28,d);",
  "float alive=smoothstep(0.0,0.03,uv.y)*(1.0-smoothstep(h*0.78,h,uv.y));",
  "return alive*max(body*0.72,core);",
  "}",
  "float flames(vec2 uv,float chapter){",
  "if(chapter<0.5){",
  "float s=sin(uTime*0.85);",
  "float a=lick(uv,0.26+s*0.11,0.05,0.96,1.25,1.8,1.0);",
  "float b=lick(uv,0.38+s*0.05,0.04,0.82,1.55,1.5,2.3);",
  "float c=lick(uv,0.52-s*0.11,0.05,0.9,1.05,1.7,3.7);",
  "float d=lick(uv,0.34-s*0.06,0.032,0.7,1.7,1.4,5.2);",
  "return max(max(a,b),max(c,d));",
  "}",
  "if(chapter<1.5){",
  "float a=lick(uv,0.40,0.034,0.98,0.7,0.35,1.2);",
  "float b=lick(uv,0.40,0.022,0.86,0.95,0.25,2.8);",
  "float c=lick(uv,0.40,0.016,0.72,1.15,0.2,4.4);",
  "return max(a,max(b,c));",
  "}",
  "float left=0.40-uv.y*0.2;",
  "float right=0.40+uv.y*0.2;",
  "float a=lick(uv,left,0.042,0.9,1.1,1.1,0.6);",
  "float b=lick(uv,left-0.03,0.028,0.72,1.4,0.9,1.9);",
  "float c=lick(uv,right,0.042,0.88,0.95,1.1,3.1);",
  "float d=lick(uv,right+0.03,0.028,0.7,1.3,0.9,4.8);",
  "return max(max(a,b),max(c,d));",
  "}",
  "void main(){",
  "vec2 uv=vec2(vUv.x+uNudge,vUv.y);",
  "float heat=flames(uv,uChapter);",
  "float luma=smoothstep(0.08,0.55,heat)*0.5+smoothstep(0.45,0.92,heat)*0.5;",
  "luma*=1.0-smoothstep(0.52,0.8,uv.x)*0.92;",
  "gl_FragColor=vec4(clamp(luma,0.0,0.92),clamp(luma,0.0,0.92),clamp(luma,0.0,0.92),1.0);",
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
    const sway = Math.sin(time * 0.7)
    if (chapter === 0) {
      const a = Math.exp(-((nx - (0.3 + sway * 0.08)) ** 2) / 0.004)
      const b = Math.exp(-((nx - (0.56 - sway * 0.08)) ** 2) / 0.0035)
      return Math.min(255, (Math.max(a, b) * 255) | 0)
    }
    if (chapter === 1) {
      const a = Math.exp(-((nx - 0.4) ** 2) / 0.0016)
      return Math.min(255, (a * 255) | 0)
    }
    const a = Math.exp(-((nx - 0.24) ** 2) / 0.0028)
    const b = Math.exp(-((nx - 0.56) ** 2) / 0.0028)
    return Math.min(255, (Math.max(a, b) * 240) | 0)
  }

  function stepFire(steps: number) {
    for (let step = 0; step < steps; step += 1) {
      for (let y = 0; y < fireH - 1; y += 1) {
        const row = y * fireW
        const above = row + fireW
        for (let x = 0; x < fireW; x += 1) {
          const wind = (hash2(x, y, time * 30 + step) % 3) - 1
          const src = Math.min(fireW - 1, Math.max(0, x + wind))
          const decay = hash2(x + 3, y, step + 9) % 5
          const value = cells[above + src]
          cells[row + x] = value > decay ? value - decay : 0
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
      for (let i = 0; i < 28; i += 1) stepFire(1)
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
    const capW = (narrow ? 480 : 960) * quality
    const capH = (narrow ? 700 : 560) * quality
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
