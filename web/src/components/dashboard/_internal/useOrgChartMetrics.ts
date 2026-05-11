"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface DialogMetrics {
  w: number;
  h: number;
  scale: number;
}

interface UseOrgChartMetricsOpts {
  open: boolean;
  loading: boolean;
  membersCount: number;
  departmentsCount: number;
  mode: string;
  showProfile: boolean;
}

const REF_W = 1380;
const REF_H = 900;
const TARGET_RATIO = REF_W / REF_H;

/** Contain max box (maxW × maxH) into TARGET_RATIO. Returns the largest
 *  ratio-locked box that fits inside the viewport-relative max. */
function fitBoxToRatio(maxW: number, maxH: number): { boxW: number; boxH: number } {
  let boxW = maxW;
  let boxH = maxW / TARGET_RATIO;
  if (boxH > maxH) {
    boxH = maxH;
    boxW = maxH * TARGET_RATIO;
  }
  return { boxW, boxH };
}

/** Two layout-effect measurements for the org-chart dialog:
 *
 *  1. `metrics` — the dialog box dimensions (full viewport-relative w/h) and
 *     the scale factor that maps the natural content size to those bounds.
 *     The reference dimensions match the largest site (구리갈매역세권) so that
 *     all sites render at the same card size — small sites just have empty
 *     space, but never reflow.
 *
 *  2. `primaryTop` — the Y offset (relative to the dialog) of the primary
 *     row (현장소장/현장대리인). The headcount status table is positioned
 *     absolutely against this so the two stay vertically aligned regardless
 *     of how many departments push the primary row down.
 *
 *  The two measurements run in different effects because (1) needs to settle
 *  before (2) can be measured against its post-scale geometry. */
export function useOrgChartMetrics({
  open,
  loading,
  membersCount,
  departmentsCount,
  mode,
  showProfile,
}: UseOrgChartMetricsOpts) {
  const contentRef = useRef<HTMLDivElement>(null);
  const primaryRowRef = useRef<HTMLDivElement>(null);
  // Seed with viewport-relative dimensions so the first paint already fills
  // the screen — otherwise width/height start at 0 and the dialog visibly
  // expands once useLayoutEffect's measure() runs, which reads as a frozen
  // dim overlay during the data fetch. Falls back to a sane SSR default.
  //
  // 다이얼로그 박스는 REF_W:REF_H(1380:900≈1.53) 종횡비로 락.
  // viewport가 더 와이드/좁아도 다이얼로그 자체 비율은 일정.
  const [metrics, setMetrics] = useState<DialogMetrics>(() => {
    if (typeof window === "undefined") return { w: 1280, h: 800, scale: 1 };
    const { boxW, boxH } = fitBoxToRatio(window.innerWidth * 0.96, window.innerHeight * 0.94);
    return { w: boxW, h: boxH, scale: 1 };
  });
  const [primaryTop, setPrimaryTop] = useState<number>(92);

  // (1) Box + scale measurement
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      const naturalW = el.offsetWidth;
      const naturalH = el.offsetHeight;
      if (!naturalW || !naturalH) return;
      // 박스는 viewport에 contain하되 종횡비(REF_W:REF_H = 1380:900 ≈ 1.53)는 락.
      // viewport가 와이드/세로형이어도 다이얼로그 비율은 일정 — 좌우 또는 상하 여백.
      // Scale은 REF_W/REF_H 기준이라 카드 크기는 모든 현장/모든 viewport에서 동일.
      const TOP_OFFSET = 80;
      const BOTTOM_PADDING = 16;
      const { boxW, boxH } = fitBoxToRatio(window.innerWidth * 0.96, window.innerHeight * 0.94);
      if (loading || membersCount === 0) {
        setMetrics({ w: boxW, h: boxH, scale: 1 });
        return;
      }
      const availableH = boxH - TOP_OFFSET - BOTTOM_PADDING;
      const effectiveRefH = Math.max(REF_H, naturalH);
      const s = Math.min(boxW / REF_W, availableH / effectiveRefH);
      setMetrics({ w: boxW, h: boxH, scale: s });
      void naturalW;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, membersCount, loading, showProfile, departmentsCount, mode]);

  // (2) Primary row Y measurement
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const primaryEl = primaryRowRef.current;
      const firstCard = primaryEl?.querySelector("div > div");
      const dialogEl = (firstCard || primaryEl)?.closest("[data-org-chart-print]") as HTMLElement | null;
      if (!primaryEl || !dialogEl) return;
      const primaryRect = primaryEl.getBoundingClientRect();
      const dialogRect = dialogEl.getBoundingClientRect();
      setPrimaryTop(primaryRect.top - dialogRect.top);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (primaryRowRef.current) ro.observe(primaryRowRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, metrics.scale, membersCount, departmentsCount]);

  return { contentRef, primaryRowRef, metrics, primaryTop };
}
