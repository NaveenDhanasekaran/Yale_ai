"use client";

import { useEffect, useRef } from "react";

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let stars: { x: number; y: number; z: number; r: number }[] = [];

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      const n = Math.min(160, Math.floor((w * h) / 9000));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        r: Math.random() * 1.3 + 0.2,
      }));
    };
    resize();

    let t = 0;
    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.x * 0.05);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${(0.15 + tw * 0.55) * s.z})`;
        ctx.fill();
        s.y += 0.04 + s.z * 0.12;
        if (s.y > h) {
          s.y = 0;
          s.x = Math.random() * w;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
