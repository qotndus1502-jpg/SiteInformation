"use client";

import { useState, useEffect } from "react";

interface UseCountUpOptions {
  ms?: number;
  start?: number;
  delay?: number;
}

export function useCountUp(
  target: number,
  { ms = 900, start = 0, delay = 40 }: UseCountUpOptions = {},
): number {
  const [v, setV] = useState(start);

  useEffect(() => {
    let raf = 0;
    const t = setTimeout(() => {
      const t0 = performance.now();
      const loop = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        const eased = 1 - Math.pow(1 - p, 3);
        setV(start + (target - start) * eased);
        if (p < 1) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }, delay);
    const fallback = setTimeout(() => setV(target), ms + 200);
    return () => {
      clearTimeout(t);
      clearTimeout(fallback);
      cancelAnimationFrame(raf);
    };
  }, [target, ms, start, delay]);

  return v;
}
