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
  const [metrics, setMetrics] = useState<DialogMetrics>({ w: 0, h: 0, scale: 1 });
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
      // 박스는 viewport 최대 크기로 고정 — 현장별 비율 조정 없음.
      // Scale은 구리갈매역세권(최대 현장) 기준 REF 치수로 계산해 모든 현장에서
      // 카드 크기가 동일하게 유지된다. 세로 꽉 차게(availableH / REF_H)가 우선,
      // 가로(boxW / REF_W)는 cap으로만 동작. naturalH > REF_H 면 clip 방지로 측정값 사용.
      const REF_W = 1380;
      const REF_H = 900;
      const TOP_OFFSET = 80;
      const BOTTOM_PADDING = 16;
      const boxW = window.innerWidth * 0.96;
      const boxH = window.innerHeight * 0.94;
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
