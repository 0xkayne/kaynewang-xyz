"use client";

import { useEffect, useRef, useState } from "react";
import { mountCryptoScene, type SceneHandle } from "@/lib/crypto-scene";

const CHAPTERS = ["协作", "验证", "取舍"] as const;

const CRYPTO_BODY =
  "陌生人如何在开放网络中协作，让结果有据可验？我关注比特币与以太坊背后的分布式系统，思考性能、安全与信任之间的取舍。比起概念本身，我更关心设计成立的条件，在这里记录学习与思考。";

export function CryptoStage() {
  const rootRef = useRef<HTMLElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const flatRef = useRef<HTMLCanvasElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const engineRef = useRef<SceneHandle | null>(null);
  const bridge = useRef<{ request: (index: number) => void }>({
    request: () => {},
  });
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    bridge.current.request = (index) => {
      setChapter(((index % 3) + 3) % 3);
    };
    const root = rootRef.current;
    const glCanvas = glRef.current;
    const flatCanvas = flatRef.current;
    if (!root || !glCanvas || !flatCanvas) return;
    const engine = mountCryptoScene(root, glCanvas, flatCanvas, bridge.current);
    engineRef.current = engine;
    engine.setChapter(0);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (!(event.target instanceof Node) || !root.contains(event.target)) return;
      event.preventDefault();
      setChapter((current) => (current + (event.key === "ArrowRight" ? 1 : 2)) % 3);
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    engineRef.current?.setChapter(chapter);
    const active = document.activeElement;
    if (active && rootRef.current?.contains(active) && active.closest("[data-chapters]")) {
      buttonRefs.current[chapter]?.focus();
    }
  }, [chapter]);

  return (
    <section
      ref={rootRef}
      id="crypto"
      className="crypto-stage"
      aria-labelledby="crypto-title"
      data-chapter={chapter}
      data-renderer="static"
    >
      <canvas ref={glRef} className="crypto-canvas crypto-canvas-gl" aria-hidden="true" />
      <canvas ref={flatRef} className="crypto-canvas crypto-canvas-2d" aria-hidden="true" />
      <div className="crypto-shade" aria-hidden="true" />
      <div className="crypto-copy">
        <h1 id="crypto-title">Crypto 与分布式系统</h1>
        <p id="crypto-body">{CRYPTO_BODY}</p>
      </div>
      <div
        className="crypto-chapters"
        data-chapters
        role="group"
        aria-label="场景"
      >
        {CHAPTERS.map((label, index) => (
          <button
            key={label}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            data-chapter={index}
            aria-pressed={chapter === index}
            onClick={() => setChapter(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        当前场景：{CHAPTERS[chapter]}
      </p>
    </section>
  );
}
