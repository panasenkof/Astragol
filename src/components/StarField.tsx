import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  vx: number;
  vy: number;
  ph: number;
  layer: number;
}

/** Full-screen drifting cosmic background used behind the menus. */
export default function StarField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: Math.min(count, 260) }, () => {
        const layer = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2;
        const sp = 3 + layer * 7;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + Math.random() * (1.5 - layer * 0.3),
          a: 0.25 + Math.random() * 0.6,
          vx: -sp * 0.6,
          vy: sp * 0.2,
          ph: Math.random() * Math.PI * 2,
          layer,
        };
      });
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const g = ctx.createLinearGradient(0, 0, w * 0.5, h);
      g.addColorStop(0, "#060418");
      g.addColorStop(0.5, "#0a0730");
      g.addColorStop(1, "#050311");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      const blobs: [number, number, number, string][] = [
        [0.25, 0.3, 0.45, "rgba(88,60,200,0.35)"],
        [0.78, 0.7, 0.4, "rgba(30,150,190,0.3)"],
        [0.6, 0.12, 0.3, "rgba(160,50,150,0.22)"],
      ];
      for (const [bx, by, br, col] of blobs) {
        const rr = Math.min(w, h) * br;
        const rg = ctx.createRadialGradient(
          bx * w,
          by * h,
          0,
          bx * w,
          by * h,
          rr
        );
        rg.addColorStop(0, col);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < -4) s.x = w + 4;
        if (s.x > w + 4) s.x = -4;
        if (s.y < -4) s.y = h + 4;
        if (s.y > h + 4) s.y = -4;
        const tw =
          0.55 + 0.45 * Math.sin(t * (0.6 + s.layer * 0.5) + s.ph);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = s.layer === 2 ? "#cfe6ff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className ?? "absolute inset-0 h-full w-full"}
    />
  );
}
