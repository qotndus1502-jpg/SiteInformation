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
    const io = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 우측 디테일 카드의 max-height를 실제 픽셀로 계산 (zoom된 컨테이너 안에서 vh가 어긋나는 문제 회피).
  // 상위 DashboardScaler가 --dashboard-zoom을 useEffect에서 세팅하는 타이밍 때문에
  // CSS var는 신뢰 불가 → 카드 자체의 getBoundingClientRect로 실제 스케일을 역산.
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const [detailMaxH, setDetailMaxH] = useState<number | null>(null);
  useEffect(() => {
    function update() {
      const el = cardWrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect(); // 실제 rendered 픽셀
      // rect.top은 화면 기준 px. rect의 width vs CSS width(500px*zoom)로 zoom 역산.
      const cssWidth = 500;
      const renderedWidth = rect.width;
      const zoom = renderedWidth > 0 ? renderedWidth / cssWidth : 1;
      const BOTTOM_MARGIN = 16;
      const visibleH = window.innerHeight - rect.top - BOTTOM_MARGIN;
      const cssH = Math.max(visibleH / zoom, 200);
      setDetailMaxH(cssH);
    }
    // 다음 프레임에 측정 (parent zoom 적용 후)
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(update));
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener("resize", update);
    };
  }, [displayedSite, panelOpen, sectionInView]);

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
          <div
            className="fixed right-4 z-50 pointer-events-none transition-opacity duration-300"
            style={{
              top: "calc(var(--sticky-header-bottom, 200px) + 40px)",
              opacity: cardVisible ? 1 : 0,
              visibility: cardVisible ? "visible" : "hidden",
            }}
          >
            {/* Zoom layer — matches DashboardScaler so the card is drawn at the
                same scale as the site list next to it */}
            <div style={{ zoom: "var(--dashboard-zoom, 1)" }}>
              <div
                className="overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto shadow-2xl rounded-xl"
                style={{
                  maxWidth: cardVisible ? 500 : 0,
                  opacity: cardVisible ? 1 : 0,
                }}
              >
                {/* Cap by viewport but shrink to fit content when shorter. */}
                <div
                  ref={cardWrapperRef}
                  className="w-[500px] overflow-y-auto overscroll-contain"
                  style={{ maxHeight: detailMaxH != null ? `${detailMaxH}px` : undefined }}
                >
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
