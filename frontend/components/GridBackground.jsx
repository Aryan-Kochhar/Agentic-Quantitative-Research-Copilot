/**
 * components/GridBackground.jsx
 * Animated star + amber grid canvas background.
 * Drop-in replacement for FinRAG's Galaxy/StarfieldBackground.
 * Zero deps — pure canvas.
 */
"use client";
import { useEffect, useRef } from "react";

export default function GridBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, stars = [], t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 8000), 150);
      stars = Array.from({ length: count }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.1 + 0.2,
        o:  Math.random() * 0.5 + 0.1,
        sp: Math.random() * 0.012 + 0.003,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Amber grid
      ctx.strokeStyle = "rgba(239,159,39,0.04)";
      ctx.lineWidth = 0.5;
      const gs = 60;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Twinkling stars
      t++;
      for (const s of stars) {
        const tw = Math.sin(t * s.sp + s.ph);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,234,240,${s.o * (0.5 + 0.5 * tw)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
