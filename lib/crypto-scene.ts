// Original grayscale silhouettes for this site: buildings, fog, people, and a record.
// Geometric stand-ins, not a third-party illustration or shader.

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
  "uniform sampler2D uFrom;",
  "uniform sampler2D uTo;",
  "uniform float uMix;",
  "uniform float uDir;",
  "uniform float uNudge;",
  "void main(){",
  "float shift=uMix*uDir+uNudge;",
  "vec2 a=vec2(vUv.x+shift,vUv.y);",
  "vec2 b=vec2(vUv.x+shift-uDir,vUv.y);",
  "vec4 col=vec4(0.0,0.0,0.0,1.0);",
  "if(a.x>=0.0&&a.x<=1.0) col=texture2D(uFrom,a);",
  "if(b.x>=0.0&&b.x<=1.0) col=texture2D(uTo,b);",
  "gl_FragColor=col;",
  "}",
].join("");

let noise: HTMLCanvasElement | null = null

function noiseTile(): HTMLCanvasElement | null {
  if (noise) return noise
  const tile = document.createElement("canvas")
  tile.width = 96
  tile.height = 96
  const ctx = tile.getContext("2d")
  if (!ctx) return null
  const image = ctx.createImageData(96, 96)
  let seed = 0x51ed
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const value = 96 + (seed % 80)
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 36
  }
  ctx.putImageData(image, 0, 0)
  noise = tile
  return tile
}

function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: number,
  front: string,
  side: string,
  top: string,
) {
  ctx.fillStyle = front
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = side
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w + d, y - d * 0.45)
  ctx.lineTo(x + w + d, y + h - d * 0.15)
  ctx.lineTo(x + w, y + h)
  ctx.fill()
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + d * 0.3, y - d * 0.45)
  ctx.lineTo(x + w + d, y - d * 0.45)
  ctx.lineTo(x + w, y)
  ctx.fill()
}

function person(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  tone: string,
  reach: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = tone
  ctx.beginPath()
  ctx.ellipse(0, -h * 0.52, h * 0.08, h * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-h * 0.03, -h * 0.42, h * 0.06, h * 0.08)
  ctx.beginPath()
  ctx.moveTo(-h * 0.18, -h * 0.34)
  ctx.quadraticCurveTo(-h * 0.26, 0, -h * 0.14, h * 0.42)
  ctx.lineTo(-h * 0.04, h * 0.42)
  ctx.lineTo(-h * 0.01, h * 0.05)
  ctx.lineTo(h * 0.01, h * 0.05)
  ctx.lineTo(h * 0.04, h * 0.42)
  ctx.lineTo(h * 0.14, h * 0.42)
  ctx.quadraticCurveTo(h * 0.26, 0, h * 0.18, -h * 0.34)
  ctx.quadraticCurveTo(0, -h * 0.2, -h * 0.18, -h * 0.34)
  ctx.fill()
  if (reach !== 0) {
    ctx.strokeStyle = tone
    ctx.lineWidth = Math.max(3, h * 0.045)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(reach > 0 ? h * 0.08 : -h * 0.08, -h * 0.06)
    ctx.quadraticCurveTo(reach * h * 0.25, -h * 0.18, reach * h * 0.4, -h * 0.22)
    ctx.stroke()
  }
  ctx.restore()
}

function slab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  checked: boolean,
) {
  ctx.fillStyle = "#f4f4f4"
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(x + w * 0.12, y + h * 0.28, w * 0.46, Math.max(2, h * 0.07))
  ctx.fillRect(x + w * 0.12, y + h * 0.5, w * 0.32, Math.max(2, h * 0.07))
  if (checked) {
    ctx.strokeStyle = "#111"
    ctx.lineWidth = Math.max(2, w * 0.05)
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(x + w * 0.62, y + h * 0.55)
    ctx.lineTo(x + w * 0.72, y + h * 0.72)
    ctx.lineTo(x + w * 0.9, y + h * 0.28)
    ctx.stroke()
  }
}

function fog(ctx: CanvasRenderingContext2D, w: number, h: number, y: number, alpha: number) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + h * 0.28)
  gradient.addColorStop(0, "rgba(180,180,180,0)")
  gradient.addColorStop(0.55, `rgba(176,176,176,${alpha})`)
  gradient.addColorStop(1, "rgba(12,12,12,0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, y, w, h * 0.3)
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, chapter: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, chapter === 2 ? "#5c5c5c" : "#c4c4c4")
  sky.addColorStop(0.42, "#6a6a6a")
  sky.addColorStop(1, "#101010")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  if (chapter === 2) {
    ctx.fillStyle = "#2c2c2c"
    ctx.beginPath()
    ctx.moveTo(w * 0.08, h * 0.78)
    ctx.lineTo(w * 0.38, h * 0.4)
    ctx.lineTo(w * 0.42, h * 0.4)
    ctx.lineTo(w * 0.22, h * 0.78)
    ctx.fill()
    ctx.fillStyle = "#8a8a8a"
    ctx.beginPath()
    ctx.moveTo(w * 0.5, h * 0.78)
    ctx.lineTo(w * 0.68, h * 0.34)
    ctx.lineTo(w * 0.76, h * 0.34)
    ctx.lineTo(w * 0.96, h * 0.78)
    ctx.fill()
  } else {
    block(ctx, w * 0.04, h * 0.34, w * 0.16, h * 0.26, w * 0.035, "#7d7d7d", "#4c4c4c", "#a3a3a3")
    block(ctx, w * 0.22, h * 0.28, w * 0.13, h * 0.32, w * 0.03, "#8f8f8f", "#555", "#b0b0b0")
    block(ctx, w * 0.64, h * 0.31, w * 0.17, h * 0.3, w * 0.04, "#727272", "#454545", "#949494")
  }
  fog(ctx, w, h, h * 0.4, chapter === 1 ? 0.55 : 0.34)

  const ground = ctx.createLinearGradient(0, h * 0.55, 0, h)
  ground.addColorStop(0, "rgba(16,16,16,0)")
  ground.addColorStop(1, "rgba(6,6,6,0.92)")
  ctx.fillStyle = ground
  ctx.fillRect(0, h * 0.5, w, h * 0.5)

  if (chapter === 0) {
    person(ctx, w * 0.3, h * 0.74, h * 0.34, "#141414", 1)
    person(ctx, w * 0.56, h * 0.76, h * 0.28, "#2a2a2a", -1)
    slab(ctx, w * 0.4, h * 0.5, w * 0.12, h * 0.09, false)
  } else if (chapter === 1) {
    ctx.fillStyle = "#3a3a3a"
    ctx.fillRect(w * 0.32, h * 0.64, w * 0.3, h * 0.045)
    ctx.fillStyle = "#222"
    ctx.fillRect(w * 0.36, h * 0.68, w * 0.035, h * 0.12)
    ctx.fillRect(w * 0.56, h * 0.68, w * 0.035, h * 0.12)
    person(ctx, w * 0.28, h * 0.72, h * 0.32, "#121212", 1)
    person(ctx, w * 0.74, h * 0.7, h * 0.22, "#4a4a4a", 0)
    slab(ctx, w * 0.4, h * 0.5, w * 0.16, h * 0.11, true)
  } else {
    person(ctx, w * 0.42, h * 0.76, h * 0.34, "#101010", 1)
    slab(ctx, w * 0.62, h * 0.56, w * 0.11, h * 0.08, false)
    ctx.strokeStyle = "#d0d0d0"
    ctx.lineWidth = Math.max(2, w * 0.004)
    ctx.beginPath()
    ctx.moveTo(w * 0.48, h * 0.78)
    ctx.lineTo(w * 0.62, h * 0.62)
    ctx.moveTo(w * 0.48, h * 0.78)
    ctx.lineTo(w * 0.7, h * 0.7)
    ctx.stroke()
  }

  ctx.fillStyle = "#0c0c0c"
  ctx.beginPath()
  ctx.moveTo(0, h * 0.66)
  ctx.lineTo(w * 0.14, h * 0.5)
  ctx.lineTo(w * 0.16, h)
  ctx.lineTo(0, h)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w, h * 0.6)
  ctx.lineTo(w * 0.86, h * 0.48)
  ctx.lineTo(w * 0.84, h)
  ctx.lineTo(w, h)
  ctx.fill()

  const tile = noiseTile()
  if (tile) {
    const pattern = ctx.createPattern(tile, "repeat")
    if (pattern) {
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }
}

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
  let texFrom: WebGLTexture | null = null
  let texTo: WebGLTexture | null = null
  let loc: {
    pos: number
    mix: WebGLUniformLocation | null
    dir: WebGLUniformLocation | null
    nudge: WebGLUniformLocation | null
    from: WebGLUniformLocation | null
    to: WebGLUniformLocation | null
  } | null = null
  let width = 2
  let height = 2
  let fromChap = 0
  let toChap = 0
  let mix = 1
  let dir = 1
  let nudge = 0
  let raf = 0
  let last = 0
  let inView = true
  let resizeTimer = 0
  let uploadedFrom = -1
  let uploadedTo = -1
  const cache = new Map<string, HTMLCanvasElement>()
  const ctx2d = canvas2d.getContext("2d", { alpha: false })
  let drag: { id: number; x: number; y: number; used: boolean } | null = null

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
  }
  window.__kayneScene = debug

  function mark(fallback?: string) {
    root.dataset.renderer = mode
    root.dataset.reduced = reduced ? "true" : "false"
    root.dataset.chapter = String(toChap)
    if (fallback) root.dataset.fallback = fallback
    else delete root.dataset.fallback
  }

  function bake(chapter: number): HTMLCanvasElement | null {
    const key = `${width}x${height}:${chapter}`
    const cached = cache.get(key)
    if (cached) return cached
    const surface = document.createElement("canvas")
    surface.width = width
    surface.height = height
    const ctx = surface.getContext("2d", { alpha: false })
    if (!ctx) return null
    paint(ctx, width, height, chapter)
    cache.set(key, surface)
    return surface
  }

  function upload(texture: WebGLTexture, source: HTMLCanvasElement) {
    if (!gl) return
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  function draw2d(from: HTMLCanvasElement, to: HTMLCanvasElement) {
    if (!ctx2d) return
    const shift = mix * dir + nudge
    ctx2d.setTransform(1, 0, 0, 1, 0, 0)
    ctx2d.fillStyle = "#000"
    ctx2d.fillRect(0, 0, width, height)
    ctx2d.drawImage(from, -shift * width, 0)
    ctx2d.drawImage(to, (-shift + dir) * width, 0)
  }

  function drawGl(from: HTMLCanvasElement, to: HTMLCanvasElement) {
    if (!gl || !program || !buffer || !texFrom || !texTo || !loc) return
    if (uploadedFrom !== fromChap) {
      upload(texFrom, from)
      uploadedFrom = fromChap
    }
    if (uploadedTo !== toChap) {
      upload(texTo, to)
      uploadedTo = toChap
    }
    gl.viewport(0, 0, width, height)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(loc.pos)
    gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1f(loc.mix, mix)
    gl.uniform1f(loc.dir, dir)
    gl.uniform1f(loc.nudge, nudge)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texFrom)
    gl.uniform1i(loc.from, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texTo)
    gl.uniform1i(loc.to, 1)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function draw() {
    const from = bake(fromChap)
    const to = bake(toChap)
    if (!from || !to) {
      mode = "static"
      mark("no-canvas")
      return
    }
    const started = performance.now()
    if (mode === "webgl") drawGl(from, to)
    else if (mode === "2d") draw2d(from, to)
    drawTimes.push(performance.now() - started)
    if (drawTimes.length > 120) drawTimes.shift()
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
  }

  function loop(now: number) {
    raf = 0
    if (document.hidden || reduced || !inView) {
      stop()
      return
    }
    if (last) {
      frames.push(now - last)
      if (frames.length > 360) frames.shift()
    }
    last = now
    mix += (1 - mix) * 0.22
    if (mix > 0.992) mix = 1
    draw()
    if (mix < 1) raf = requestAnimationFrame(loop)
    else last = 0
  }

  function start() {
    if (raf || reduced || document.hidden || !inView || mix >= 1) return
    last = 0
    raf = requestAnimationFrame(loop)
  }

  function switchTo2d(reason: string) {
    stop()
    mode = ctx2d ? "2d" : "static"
    gl = null
    mark(reason)
    if (mode === "2d") draw()
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
    texFrom = gl.createTexture()
    texTo = gl.createTexture()
    if (!buffer || !texFrom || !texTo) return false
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    loc = {
      pos: gl.getAttribLocation(program, "aPos"),
      mix: gl.getUniformLocation(program, "uMix"),
      dir: gl.getUniformLocation(program, "uDir"),
      nudge: gl.getUniformLocation(program, "uNudge"),
      from: gl.getUniformLocation(program, "uFrom"),
      to: gl.getUniformLocation(program, "uTo"),
    }
    return true
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    let nextW = Math.max(2, Math.round(rect.width * dpr))
    let nextH = Math.max(2, Math.round(rect.height * dpr))
    const scale = Math.min(1, 960 / Math.max(nextW, nextH))
    nextW = Math.max(2, Math.round(nextW * scale))
    nextH = Math.max(2, Math.round(nextH * scale))
    if (nextW === width && nextH === height && cache.size) {
      draw()
      return
    }
    width = nextW
    height = nextH
    glCanvas.width = width
    glCanvas.height = height
    canvas2d.width = width
    canvas2d.height = height
    cache.clear()
    uploadedFrom = -1
    uploadedTo = -1
    draw()
  }

  function setChapter(index: number) {
    const next = ((index % 3) + 3) % 3
    if (cache.size === 0) {
      fromChap = next
      toChap = next
      mix = 1
      resize()
      return
    }
    if (next === toChap && mix === 1) return
    dir = ((next - toChap + 3) % 3) === 1 ? 1 : -1
    fromChap = mix === 1 ? toChap : fromChap
    toChap = next
    nudge = 0
    mix = reduced ? 1 : 0
    root.dataset.chapter = String(next)
    draw()
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
      bridge.request(toChap + (dx < 0 ? 1 : -1))
      return
    }
    if (!drag.used) {
      nudge = Math.max(-0.04, Math.min(0.04, dx / Math.max(1, root.clientWidth)))
      if (mix >= 1) draw()
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    if (nudge !== 0) {
      nudge = 0
      if (mix >= 1) draw()
    }
  }

  function onVisibility() {
    if (document.hidden) stop()
    else if (!reduced && mix < 1) start()
  }

  function onMotion() {
    reduced = motion.matches
    root.dataset.reduced = reduced ? "true" : "false"
    if (reduced) {
      mix = 1
      stop()
      draw()
    }
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
            if (!inView) stop()
            else if (!reduced && mix < 1) start()
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
  observer?.observe(root)
  root.addEventListener("pointerdown", onPointerDown)
  root.addEventListener("pointermove", onPointerMove)
  root.addEventListener("pointerup", onPointerUp)
  root.addEventListener("pointercancel", onPointerUp)
  glCanvas.addEventListener("webglcontextlost", onLost)
  document.addEventListener("visibilitychange", onVisibility)
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
    }
  }
}
