"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const BASE_W = 1560;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Page-level zoom wrapper.
 *
 *  The dashboard layout is authored at a fixed 1560px width and then scaled
 *  via CSS `zoom` to fill whatever viewport is available. The scale factor is
 *  also written to `--dashboard-zoom` because the floating site detail card
 *  (rendered through a portal, outside this subtree) needs to read the same
 *  zoom and re-apply it. Don't replace `zoom` with `transform: scale` — it
 *  collapses layout in a way the floating card relies on. */
export function DashboardScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    let rafId: number | null = null;
    function update() {
      const s = Math.max(window.innerWidth / BASE_W, 0.5);
      setScale((prev) => (prev === s ? prev : s));
      document.documentElement.style.setProperty("--dashboard-zoom", String(s));
    }
    function scheduleUpdate() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    }
    update();
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="-mx-4 -mt-0.5 -mb-4 sm:-mx-6 sm:-mb-4 overflow-x-hidden"
      style={{ minHeight: "calc(100vh - 52px)" }}
    >
      <div
        className="flex flex-col gap-3 px-6 pt-0 pb-2"
        style={{
          width: BASE_W,
          zoom: scale ?? 1,
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
