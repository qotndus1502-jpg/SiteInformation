"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SiteList } from "@/components/dashboard/site-list";
import { SiteDetail } from "@/components/dashboard/site-detail";
import type { SiteDashboard } from "@/types/database";

interface SiteListWithDetailProps {
  sites: SiteDashboard[];
  selectedSite: SiteDashboard | null;
  /** displayedSite differs from selectedSite during the close animation —
   *  the parent keeps the previous site mounted while panelOpen=false slides
   *  the card out, then drops displayedSite to null. */
  displayedSite: SiteDashboard | null;
  panelOpen: boolean;
  onSelectSite: (s: SiteDashboard) => void;
  onCloseSite: () => void;
  onSavedSite?: () => void;
  addButton?: React.ReactNode;
  isAdmin?: boolean;
  embedded?: boolean;
}

/** Sites table on the left, floating detail card on the right.
 *
 *  The detail card is rendered into `document.body` via portal so it escapes
 *  DashboardScaler's `zoom`, then re-applies the same zoom internally. This
 *  lets the card be `position: fixed` against the viewport while still
 *  scaling with the rest of the dashboard.
 *
 *  Visibility is gated by an IntersectionObserver on the list section — when
 *  the user scrolls up past the list, the floating card hides so it doesn't
 *  cover the chart grid. */
export function SiteListWithDetail({
  sites,
  selectedSite,
  displayedSite,
  panelOpen,
  onSelectSite,
  onCloseSite,
  onSavedSite,
  addButton,
  isAdmin = false,
  embedded = false,
}: SiteListWithDetailProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Track whether the SITE LIST section is visible in the viewport so the
  // floating detail card hides when the user scrolls up to the dashboard area.
  const sectionRef = useRef<HTMLDivElement>(null);
  const [sectionInView, setSectionInView] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    // rootMargin shrinks the bottom of the viewport by a small amount so the
    // floating card hides only when the user has truly scrolled past the
    // list. Earlier value (-20%) made the card disappear while users were
    // still interacting with the bottom rows.
    const io = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cardVisible = panelOpen && sectionInView;

  const content = (
    <>
      <div ref={sectionRef} className="relative">
        {/* List transitions to make room for floating detail panel */}
        <div
          className="transition-[padding-right] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ paddingRight: cardVisible ? 516 : 0 }}
        >
          <div className="relative">
            {addButton}
            <SiteList
              sites={sites}
              selectedSiteId={selectedSite?.id ?? null}
              onSelect={onSelectSite}
              showAddressWarnings={isAdmin}
            />
          </div>
        </div>
      </div>
      {/* Floating detail card: portal to body so it escapes DashboardScaler's zoom,
          but then re-applies the same zoom internally so the card scales in sync
          with the list. The card is only shown while the SITE LIST section is in
          the viewport — scrolling up to the dashboard/charts hides it. */}
      {mounted && displayedSite &&
        createPortal(
          /* Zoom layer has explicit calc'd CSS height = (viewport - top_offset - bottom_margin) / zoom,
             so its rendered height (after zoom) matches viewport - top_offset - bottom_margin.
             50px bottom margin matches showDetailMap mode. */
          <div
            className="fixed z-50 pointer-events-none transition-opacity duration-300"
            style={{
              /* showDetailMap과 동일한 위치/높이 공식:
                  - top: sticky + pt-1.5(6 CSS px)*zoom screen = showDetailMap의 flex 컨테이너 top과 일치
                  - right: KPI 우측(DashboardScaler px-6 = 24 CSS * zoom screen)과 정렬 */
              right: "calc(24px * var(--dashboard-zoom, 1))",
              top: "calc(var(--sticky-header-bottom, 200px) + 6px * var(--dashboard-zoom, 1))",
              opacity: cardVisible ? 1 : 0,
              visibility: cardVisible ? "visible" : "hidden",
            }}
          >
            <div
              style={{
                zoom: "var(--dashboard-zoom, 1)",
                /* showDetailMap flex 컨테이너와 동일: 렌더 높이 = 100vh - sticky - 50 screen */
                height:
                  "calc((100vh - var(--sticky-header-bottom, 200px) - 50px) / var(--dashboard-zoom, 1))",
              }}
            >
              <div
                className="h-full overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto"
                style={{
                  maxWidth: cardVisible ? 500 : 0,
                  opacity: cardVisible ? 1 : 0,
                }}
              >
                <div className="w-[500px] h-full overflow-y-auto overscroll-contain">
                  <SiteDetail site={displayedSite} onClose={onCloseSite} onSaved={onSavedSite} />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );

  if (embedded) return content;
  return <>{content}</>;
}
