"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FADE_MS = 1500;
const BLUR_PX = 16;

/** "Come into focus" entrance on route changes — opacity AND blur fade
 *  together so the new page materializes from a soft, out-of-focus state
 *  rather than just popping in dimmer.
 *
 *  Implementation: bump a `key` on the wrapper at every pathname change so
 *  the element remounts and the CSS animation plays from frame 0. We
 *  deliberately avoid `transition` here — toggling state to drive the same
 *  effect causes the previous page's still-mounted DOM to start a fade-OUT
 *  that's then reversed two rAFs later, producing the "snap, no blur"
 *  behavior we hit in the transition-based version. With a key-driven
 *  remount + `@keyframes`, the new element is born in the unfocused
 *  keyframe and animates forward unconditionally.
 *
 *  Flow with no `loading.tsx` on the destination route: App Router holds
 *  navigation until the new page's server data resolves, so the previous
 *  page stays visible during the wait. The instant the new pathname +
 *  children commit, the wrapper remounts and animates in over FADE_MS.
 *  First mount runs the same animation — fine, the layout renders in too. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayed, setDisplayed] = useState(children);
  const [animKey, setAnimKey] = useState(0);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) {
      setDisplayed(children);
      return;
    }
    lastPath.current = pathname;
    setDisplayed(children);
    setAnimKey((k) => k + 1);
  }, [pathname, children]);

  return (
    <>
      {/* Inline keyframes — co-located with the only consumer. Static string
          so React doesn't re-inject on every render. */}
      <style>{`
        @keyframes pageFocusIn {
          from { opacity: 0; filter: blur(${BLUR_PX}px); }
          to   { opacity: 1; filter: blur(0); }
        }
      `}</style>
      <div
        key={animKey}
        style={{
          animation: `pageFocusIn ${FADE_MS}ms ease-out backwards`,
        }}
      >
        {displayed}
      </div>
    </>
  );
}
