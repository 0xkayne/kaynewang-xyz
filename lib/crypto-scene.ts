// Procedural grayscale fire for the homepage scene.
// The flame shape is ittybitty/fire (campfire, torch, wall), converted to
// grayscale. Chapter 协作 / 验证 / 取舍 selects those three shapes.
// Backing pixels stay near 480×270, the size measured in the throwaway proof.
//
// Copyright (c) 2026 Blake
// Source: https://github.com/blakecyze/ittybitty-shaders/blob/main/shaders/fire.js
// License: https://github.com/blakecyze/ittybitty-shaders/blob/main/LICENSE
// SPDX-License-Identifier: MIT
// LICENSE sha256: 6f378b55d72304c0a0c6e647f6b4c372b5e7d398dfb0b4b5bd7d31fb3e79716a
// fire.js sha256: 97bcf76e15117511c058e7767757a54b105b16a419d85e24c208225910011470
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export type SceneHandle = {
  setChapter: (index: number) => void
  destroy: () => void
}

type Mode = "webgl" | "2d" | "static"

type Bridge = {
  request: (index: number) => void
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uZoom;
uniform float uShowFlames;
uniform float uShowEmbers;
uniform float uShowGlow;
uniform float uTime;
uniform float uNudge;
uniform float uHeight;
uniform float uTurbulence;
uniform float uEmbers;
uniform float uHeat;
uniform float uShape;     // 0 campfire, 1 torch, 2 wall
uniform float uStylised;
uniform vec3 uTint;       // linear RGB
uniform vec3 uBackground;
uniform float uInteractive;
uniform float uTransparent;
uniform vec2 uPointer;
uniform float uPointerActive;

out vec4 fragColor;

float hash12(vec2 p) {
  vec3 q = fract(p.xyx * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash22(vec2 p) {
  vec3 q = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

// Rising turbulence: each octave scrolls upward faster than the last, so
// small wisps race up through the slower, larger billows.
float fbm(vec2 p, float t) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p - vec2(0.0, t * (1.2 + float(i) * 0.6)));
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Flame colour by temperature, 0 (cooling) to 1 (white-hot core): a
// blackbody-like ramp from deep red through orange and yellow to white.
vec3 blackbody(float k) {
  vec3 c = vec3(0.0);
  c += vec3(0.6, 0.05, 0.01) * smoothstep(0.0, 0.3, k);
  c += vec3(0.5, 0.24, 0.0) * smoothstep(0.2, 0.55, k);
  c += vec3(0.3, 0.5, 0.14) * smoothstep(0.45, 0.8, k);
  c += vec3(0.15, 0.25, 0.5) * smoothstep(0.8, 1.0, k);
  return c * mix(0.6, 2.4, k * k);
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

uniform vec2 uPointerFlow;

// Zoom about the middle of the bottom edge, so the ground stays put: a
// pixel, or a point in 0..1 canvas space (such as the pointer), as the
// zoomed view sees it.
vec2 zoomed(vec2 fc) {
  vec2 anchor = vec2(0.5 * uResolution.x, 0.0);
  return (fc - anchor) / uZoom + anchor;
}

vec2 zoomedUv(vec2 uv) {
  return (uv - vec2(0.5, 0.0)) / uZoom + vec2(0.5, 0.0);
}

void main() {
  vec2 uv = zoomed(gl_FragCoord.xy) / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  p.x += uNudge;
  float t = uTime;
  float base = 0.05;
  bool wall = uShape > 1.5;
  bool torch = uShape > 0.5 && !wall;
  float width = torch ? 0.075 : 0.22;
  float tall = mix(0.25, 1.0, uHeight) * (torch ? 0.75 : 1.0);
  float y = max(p.y - base, 0.0) / tall;                   // 0 base, 1 tip

  // Wind from the pointer, so the whole fire moves as one: a steady lean
  // away from the pointer when it is near, and a gust that follows the
  // pointer's movement, trailing the flames after a swipe.
  float blow = uInteractive * uPointerActive;
  vec2 hand = vec2((zoomedUv(uPointer).x - 0.5) * aspect, zoomedUv(uPointer).y);
  float dx = hand.x - (wall ? p.x : 0.0);
  float away = -dx / sqrt(dx * dx + 0.03) * exp(-dx * dx * 3.0) * smoothstep(tall * 1.6 + base, 0.0, hand.y);
  // A swipe: a gust from the pointer's movement, steady at any
  // responsiveness, that dies away after the pointer stops.
  float swipe = clamp(uPointerFlow.x * aspect * 0.35, -1.0, 1.0);
  float wind = clamp(away * 0.6 + swipe, -1.2, 1.2) * blow;

  float heat = 0.0;
  // Even the tallest tongue ends below this height.
  if (uShowFlames > 0.0 && (y < 1.8 || 0.4 + uTurbulence * 0.9 < 0.0)) {
    // Rising turbulence displaces the flame sideways, more towards the tips,
    // so tongues lick and twist rather than stand straight.
    vec2 q = vec2(p.x * 5.0, p.y * 3.2);
    float sway = (fbm(q * 0.7 + vec2(3.1, 0.0), t * 0.9) - 0.5) * 4.0;
    // Finer licks ride on top, racing upward, so every edge flickers.
    float lick = (fbm(q * 2.2 + vec2(8.3, 0.0), t * 2.4) - 0.5) * 4.0;
    float x = p.x - ((sway * 0.3 + lick * 0.12) * uTurbulence * y + wind * 0.45 * y * (0.4 + y)) * tall;

    // Density of fuel burning at this point: a teardrop per flame, broad at
    // the base and narrowing to a tip. Nothing outside the flames.
    float d = 0.0;
    if (wall) {
      // A row of tongues of uneven height, each rising and falling.
      float reach = 0.55 + 0.45 * noise(vec2(x * 6.0, t * 0.7)) + 0.25 * noise(vec2(x * 17.0, t * 1.3));
      d = smoothstep(1.3, 0.1, y / reach) * 1.1;
    } else {
      float count = torch ? 1.0 : 5.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        if (fi >= count) break;
        float u = count > 1.0 ? fi / (count - 1.0) - 0.5 : 0.0;
        float h = hash12(vec2(fi, 3.7));
        // Taller in the middle; each flame on its own clock.
        float reach = torch ? 1.0 : mix(0.35, 1.15, pow(1.0 - abs(u) * 1.8, 1.5)) * (0.85 + 0.3 * h);
        float yi = y / reach;
        float cx = u * width * 1.5 + (h - 0.5) * 0.04 + sin(t * (1.5 + h) + fi * 2.0) * 0.012 * yi;
        float w = (torch ? width : width * 0.42) * mix(1.0, 0.18, clamp(yi, 0.0, 1.0)) * (0.9 + 0.3 * sin(min(yi, 1.0) * 3.14159));
        float across = (x - cx) / w;
        d += exp(-across * across * 2.2) * smoothstep(1.3, 0.1, yi) * (torch ? 1.2 : 0.95);
      }
    }
    // Round off the base, as flames spring from the fuel, not a straight line.
    d *= smoothstep(-0.04, 0.03, p.y - base + 0.03 * noise(vec2(p.x * 8.0, 1.0)));

    // Turbulence only subtracts density, so empty air needs no more noise.
    if (d * 1.3 > 0.02 || 0.4 + uTurbulence * 0.9 < 0.0) {
      // Turbulence eats into the flame, more strongly higher up, tearing the
      // tips into tongues that pinch off as wisps.
      // Two scales: broad billows, and fine licks that tear the tips.
      float n = fbm(q + vec2(sway * 0.4, 0.0), t * 1.4) * 0.5 + fbm(q * 2.3 + 5.0, t * 2.6) * 0.5;
      // Only ever subtracts, so empty air never catches.
      d = d * 1.3 - smoothstep(0.25, 0.75, n) * (0.15 + y * y * 1.8) * (0.4 + uTurbulence * 0.9);
      // Temperature: the density, hottest in the core low down.
      heat = smoothstep(0.02, 1.3, d) * mix(0.55, 1.0, smoothstep(0.7, 0.0, y));
      // Brighter and dimmer streaks rising through the body.
      heat *= 0.8 + 0.4 * smoothstep(0.3, 0.7, n);
    }
  }

  // Outside the branches above, so the derivative below is well defined.
  float k = clamp(heat * mix(0.5, 1.0, uHeat), 0.0, 1.0);
  float soft = smoothstep(0.0, 0.04, k);
  if (uStylised > 0.5) {
    // Cel shading, as in games: three flat bands with clean edges. The
    // edges stay crisp at any scale because the bands are cut on the
    // smooth field, antialiased over a pixel.
    float aa = fwidth(k) * 1.2 + 1e-4;
    float band = smoothstep(0.1 - aa, 0.1 + aa, k) * 0.38 + smoothstep(0.35 - aa, 0.35 + aa, k) * 0.28 + smoothstep(0.62 - aa, 0.62 + aa, k) * 0.28;
    k = band;
    soft = smoothstep(0.1 - aa, 0.1 + aa, heat * mix(0.5, 1.0, uHeat));
  }
  vec3 flame = blackbody(k) * uTint * soft * uShowFlames;

  // Embers: small bright sparks drifting up and swaying, fading as they cool.
  vec3 sparks = vec3(0.0);
  if (uEmbers > 0.0 && uShowEmbers > 0.5) {
    for (int i = 0; i < 2; i++) {
      float s = 18.0 + float(i) * 13.0;
      vec2 e = vec2((p.x - wind * 0.3 * p.y) * s, (p.y - t * (0.25 + float(i) * 0.1)) * s);
      e.x += sin(e.y * 0.35 + float(i) * 3.0) * 1.2;
      vec2 cell = floor(e);
      vec2 h = hash22(cell + float(i) * 31.0);
      if (h.x < uEmbers * 0.12) {
        vec2 ed = fract(e) - h;
        float life = smoothstep(1.1, 0.1, (p.y - base) / tall) * (wall ? 1.0 : smoothstep(width * 2.0 + 0.1, 0.0, abs(p.x)));
        sparks += vec3(1.0, 0.45, 0.1) * exp(-dot(ed, ed) * 90.0) * life * 3.0;
      }
    }
  }

  // Glow: light the fire casts on its surroundings, flickering with it.
  float flicker = 0.85 + 0.15 * noise(vec2(t * 3.0, 0.5));
  float glow = wall ? exp(-max(p.y - base, 0.0) * 3.0) : exp(-length(vec2(p.x, (p.y - base - tall * 0.2) * 1.3)) * (torch ? 5.0 : 3.5));
  vec3 spill = vec3(0.9, 0.3, 0.08) * glow * 0.14 * flicker * mix(0.6, 1.2, uHeat) * uTint * uShowGlow;

  vec3 light = flame + sparks;
  vec3 colour = uBackground + spill + light;
  colour = 1.0 - exp(-colour * 1.3);
  vec3 c = linearToSrgb(colour);
  c += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  if (uTransparent > 0.5) {
    vec3 lc = linearToSrgb(1.0 - exp(-(light + spill) * 1.3));
    fragColor = vec4(lc, max(lc.r, max(lc.g, lc.b)));
    return;
  }
  float g = max(c.r, max(c.g, c.b));
  fragColor = vec4(vec3(g), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
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
  let gl: WebGL2RenderingContext | null = null
  let program: WebGLProgram | null = null
  let loc: {
    resolution: WebGLUniformLocation | null
    zoom: WebGLUniformLocation | null
    flames: WebGLUniformLocation | null
    embersOn: WebGLUniformLocation | null
    glow: WebGLUniformLocation | null
    time: WebGLUniformLocation | null
    height: WebGLUniformLocation | null
    turbulence: WebGLUniformLocation | null
    embers: WebGLUniformLocation | null
    heat: WebGLUniformLocation | null
    shape: WebGLUniformLocation | null
    stylised: WebGLUniformLocation | null
    tint: WebGLUniformLocation | null
    background: WebGLUniformLocation | null
    interactive: WebGLUniformLocation | null
    transparent: WebGLUniformLocation | null
    pointer: WebGLUniformLocation | null
    pointerActive: WebGLUniformLocation | null
    pointerFlow: WebGLUniformLocation | null
    nudge: WebGLUniformLocation | null
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
    if (!gl || !program || !loc) return
    gl.viewport(0, 0, width, height)
    gl.useProgram(program)
    const set1 = (slot: WebGLUniformLocation | null, value: number) => {
      if (slot) gl?.uniform1f(slot, value)
    }
    const set2 = (slot: WebGLUniformLocation | null, x: number, y: number) => {
      if (slot) gl?.uniform2f(slot, x, y)
    }
    const set3 = (slot: WebGLUniformLocation | null, x: number, y: number, z: number) => {
      if (slot) gl?.uniform3f(slot, x, y, z)
    }
    set2(loc.resolution, width, height)
    set1(loc.zoom, 1)
    set1(loc.flames, 1)
    set1(loc.embersOn, 1)
    set1(loc.glow, 0.25)
    set1(loc.time, reduced ? 1.2 : time)
    set1(loc.height, 0.72)
    set1(loc.turbulence, 0.85)
    set1(loc.embers, 0.45)
    set1(loc.heat, 0.85)
    set1(loc.shape, chapter)
    set1(loc.stylised, 0)
    set3(loc.tint, 1, 1, 1)
    set3(loc.background, 0.012, 0.012, 0.012)
    set1(loc.interactive, 0)
    set1(loc.transparent, 0)
    set2(loc.pointer, 0.5, 0.2)
    set1(loc.pointerActive, 0)
    set2(loc.pointerFlow, 0, 0)
    set1(loc.nudge, nudge)
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
      if (p95 > 55) {
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
      gl = glCanvas.getContext("webgl2", {
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
      return false
    }
    loc = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      zoom: gl.getUniformLocation(program, "uZoom"),
      flames: gl.getUniformLocation(program, "uShowFlames"),
      embersOn: gl.getUniformLocation(program, "uShowEmbers"),
      glow: gl.getUniformLocation(program, "uShowGlow"),
      time: gl.getUniformLocation(program, "uTime"),
      height: gl.getUniformLocation(program, "uHeight"),
      turbulence: gl.getUniformLocation(program, "uTurbulence"),
      embers: gl.getUniformLocation(program, "uEmbers"),
      heat: gl.getUniformLocation(program, "uHeat"),
      shape: gl.getUniformLocation(program, "uShape"),
      stylised: gl.getUniformLocation(program, "uStylised"),
      tint: gl.getUniformLocation(program, "uTint"),
      background: gl.getUniformLocation(program, "uBackground"),
      interactive: gl.getUniformLocation(program, "uInteractive"),
      transparent: gl.getUniformLocation(program, "uTransparent"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      pointerActive: gl.getUniformLocation(program, "uPointerActive"),
      pointerFlow: gl.getUniformLocation(program, "uPointerFlow"),
      nudge: gl.getUniformLocation(program, "uNudge"),
    }
    return loc.time !== null && loc.shape !== null
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    let nextW = Math.max(2, Math.round(rect.width))
    let nextH = Math.max(2, Math.round(rect.height))
    const budget = 480 * 270 * quality
    const scale = Math.min(1, Math.sqrt(budget / Math.max(1, nextW * nextH)))
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
