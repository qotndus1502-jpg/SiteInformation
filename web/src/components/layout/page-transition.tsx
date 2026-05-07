"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FADE_OUT_MS = 400;
const FADE_IN_MS = 1000;

/** Sequential fade-out → fade-in on route changes.
 *
 *  Holds the previous page's children in state until the fade-out completes,
 *  then swaps to the new children at opacity 0 and fades them in. Sequential
 *  rather than crossfade because Next.js's app router unmounts the previous
 *  route synchronously — we don't have access to the old DOM to crossfade
 *  against. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayed, setDisplayed] = useState(children);
  const [opacity, setOpacity] = useState(1);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) {
      // Same path, just children re-rendered — keep displayed in sync without animation.
      setDisplayed(children);
      return;
    }
    lastPath.current = pathname;

    setOpacity(0);
    const t = setTimeout(() => {
      setDisplayed(children);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpacity(1));
      });
    }, FADE_OUT_MS);

    return () => clearTimeout(t);
  }, [pathname, children]);

  return (
    <div
      style={{
        opacity,
        transition: `opacity ${opacity === 0 ? FADE_OUT_MS : FADE_IN_MS}ms ease-out`,
      }}
    >
      {displayed}
    </div>
  );
}
