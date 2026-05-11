"use client";

import { memo, useState, useEffect, useMemo } from "react";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { charts } from "@/lib/chart-colors";
import { KoreaMapSkeleton } from "./_skeletons/KoreaMapSkeleton";

/* ── Types ──────────────────────────────────────────────── */

interface RegionStat {
  region: string;
  count: number;
  total_contract: number;
  total_headcount: number;
  avg_progress: number;
}

interface KoreaMapChartProps {
  data: RegionStat[];
  onShowDetailMap?: () => void;
  /** Cross-filter: currently filtered region (for highlight). null/undefined = none */
  selectedRegion?: string | null;
  /** Cross-filter: called when user clicks a bubble. Pass null to clear. */
  onRegionClick?: (region: string | null) => void;
}

/* ── GeoJSON name → region key ────────────────────────── */

const NAME_MAP: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
  "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
  "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기",
  "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주",
};

/* ── 권역 grouping ────────────────────────────────────── */

const AREA_GROUPS: Record<string, { label: string; members: string[] }> = {
  "수도권": { label: "수도권", members: ["서울", "인천", "경기"] },
  "강원권": { label: "강원권", members: ["강원"] },
  "충청권": { label: "충청권", members: ["대전", "세종", "충북", "충남"] },
  "대경권": { label: "대경권", members: ["대구", "경북"] },
  "동남권": { label: "동남권", members: ["부산", "울산", "경남"] },
  "호남권": { label: "호남권", members: ["광주", "전북", "전남"] },
};

const REGION_TO_AREA: Record<string, string> = {};
for (const [area, cfg] of Object.entries(AREA_GROUPS)) {
  for (const m of cfg.members) REGION_TO_AREA[m] = area;
}

/* ── Minimal nudges (only where centroid is very off) ── */

const NUDGE: Record<string, { dx: number; dy: number }> = {
  "인천": { dx: -25, dy: 20 },
  "서울": { dx: -10, dy: -25 },
  "광주": { dx: -8, dy: 0 },
  "제주": { dx: 0, dy: -160 },
};

/* ── Metric config ────────────────────────────────────── */

type MetricKey = "count" | "total_headcount" | "total_contract";

interface MetricCfg {
  key: MetricKey;
  label: string;
  unit: string;
  /** Bubble fill (light end of the gradient). */
  color: string;
  /** Bubble fill on hover/active (slightly more saturated). */
  hoverColor: string;
  /** Outer ring drawn on hover/selected — uses the deepest tone for contrast. */
  ring: string;
  /** SVG drop-shadow flood color — re-tinted per metric so the map theme stays cohesive. */
  shadow: string;
}

const M = charts.koreaMap.metric;
const METRICS: MetricCfg[] = [
  { key: "count",           label: "현장 수",   unit: "개",
    color: M.count.bubble,     hoverColor: M.count.bubbleHover,
    ring:  M.count.ring,       shadow:     M.count.shadow },
  { key: "total_headcount", label: "현장 인원", unit: "명",
    color: M.headcount.bubble, hoverColor: M.headcount.bubbleHover,
    ring:  M.headcount.ring,   shadow:     M.headcount.shadow },
  { key: "total_contract",  label: "자사도급액", unit: "억",
    color: M.contract.bubble,  hoverColor: M.contract.bubbleHover,
    ring:  M.contract.ring,    shadow:     M.contract.shadow },
];

/** Tailwind class strings for the metric toggle pill — listed statically so
 *  the JIT picks up every variant. Don't build these from string concat. */
const TOGGLE_ACTIVE_CLASSES: Record<MetricKey, string> = {
  count:           "bg-blue-50   text-blue-700   hover:bg-blue-100",
  total_headcount: "bg-sky-50    text-sky-700    hover:bg-sky-100",
  total_contract:  "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
};

/* ── Bubble radius ────────────────────────────────────── */

function bubbleR(value: number, max: number, metric?: MetricKey): number {
  if (max <= 0 || value <= 0) return 0;
  const ratio = value / max;
  const curved = Math.pow(ratio, 0.5);
  const minR = 35;
  return minR + curved * (120 - minR); // min 35, max 120
}

/* ── Collision resolution ─────────────────────────────── */

interface BubblePos {
  key: string;
  cx: number;
  cy: number;
  r: number;
  stat: RegionStat | undefined;
}

function resolveOverlaps(bubbles: BubblePos[], iterations = 30): BubblePos[] {
  const result = bubbles.map((b) => ({ ...b }));
  const padding = 5;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        let dx = b.cx - a.cx;
        let dy = b.cy - a.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const minDist = a.r + b.r + padding;

        if (dist < minDist) {
          // When nearly on same spot, push diagonally instead of straight line
          if (dist < 3) {
            dx = (i % 2 === 0 ? 1 : -1) * 5;
            dy = (j % 2 === 0 ? 1 : -1) * 3;
          }
          const d2 = Math.sqrt(dx * dx + dy * dy) || 1;
          const overlap = (minDist - dist) / 2;
          const ux = dx / d2;
          const uy = dy / d2;

          const totalR = a.r + b.r || 1;
          const ratioA = b.r / totalR;
          const ratioB = a.r / totalR;

          a.cx -= ux * overlap * ratioA;
          a.cy -= uy * overlap * ratioA;
          b.cx += ux * overlap * ratioB;
          b.cy += uy * overlap * ratioB;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return result;
}

/* ── Component ────────────────────────────────────────── */

type ViewMode = "region" | "area";

export const KoreaMapChart = memo(function KoreaMapChart({ data: initialData, onShowDetailMap, selectedRegion, onRegionClick }: KoreaMapChartProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("region");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("count");

  useEffect(() => {
    fetch("/korea-provinces.json")
      .then((r) => r.json())
      .then((raw: FeatureCollection) => setGeo(raw))
      .catch(() => {});
  }, []);

  // Trust the parent's filtered prop directly — no local copy, no fallback fetch.
  const data = initialData;

  const byRegion = useMemo(() => new Map(data.map((d) => [d.region, d])), [data]);

  const areaStats = useMemo(() => {
    const map = new Map<string, RegionStat>();
    for (const [area, cfg] of Object.entries(AREA_GROUPS)) {
      let count = 0, contract = 0, headcount = 0, progressSum = 0;
      for (const m of cfg.members) {
        const s = byRegion.get(m);
        if (!s) continue;
        count += s.count; contract += s.total_contract;
        headcount += s.total_headcount; progressSum += s.avg_progress * s.count;
      }
      map.set(area, {
        region: area, count, total_contract: contract,
        total_headcount: headcount, avg_progress: count > 0 ? progressSum / count : 0,
      });
    }
    return map;
  }, [byRegion]);

  const displayData = mode === "region"
    ? data.filter((d) => d.region !== "해외" && d.region !== "제주")
    : Array.from(areaStats.values());

  const metricCfg = METRICS.find((m) => m.key === activeMetric)!;
  const maxVal = Math.max(...displayData.map((d) => d[activeMetric]), 1);
  const totalSites = data.reduce((s, d) => s + d.count, 0);
  const totalHead = data.reduce((s, d) => s + d.total_headcount, 0);

  const W = 700;
  const H = 1210;

  // 해외 stat
  const overseasStat = data.find((d) => d.region === "해외");

  const { pathGen, centroids } = useMemo(() => {
    if (!geo) return { pathGen: null, centroids: new Map<string, [number, number]>() };
    const projection = geoMercator().center([127.8, 36.2]).scale(13000).translate([W / 2, H / 2 + 30]);
    const pg = geoPath(projection);
    const cm = new Map<string, [number, number]>();
    for (const feature of geo.features) {
      const name = feature.properties?.name as string;
      const key = NAME_MAP[name];
      if (!key) continue;
      const c = geoCentroid(feature as Feature<Geometry>);
      const projected = projection(c);
      if (projected) cm.set(key, projected as [number, number]);
    }
    return { pathGen: pg, centroids: cm };
  }, [geo]);

  const areaCentroids = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const [area, cfg] of Object.entries(AREA_GROUPS)) {
      let sx = 0, sy = 0, n = 0;
      for (const m of cfg.members) {
        const c = centroids.get(m);
        if (c) { sx += c[0]; sy += c[1]; n++; }
      }
      if (n > 0) map.set(area, [sx / n, sy / n]);
    }
    return map;
  }, [centroids]);

  const hoveredRegions = useMemo(() => {
    if (!hovered) return new Set<string>();
    if (mode === "area") {
      const cfg = AREA_GROUPS[hovered];
      return cfg ? new Set(cfg.members) : new Set<string>();
    }
    return new Set([hovered]);
  }, [hovered, mode]);

  const getHoveredStat = (): RegionStat | null => {
    if (!hovered) return null;
    if (hovered === "해외") return overseasStat ?? null;
    if (mode === "area") return areaStats.get(hovered) ?? null;
    return byRegion.get(hovered) ?? null;
  };

  if (!geo || !pathGen) {
    return <KoreaMapSkeleton />;
  }

  // Build raw bubble positions
  const rawBubbles: BubblePos[] = (mode === "region"
    ? Array.from(centroids.entries())
        .map(([key, pos]) => {
          const n = NUDGE[key] ?? { dx: 0, dy: 0 };
          const stat = byRegion.get(key);
          const val = stat?.[activeMetric] ?? 0;
          return { key, cx: pos[0] + n.dx, cy: pos[1] + n.dy, r: bubbleR(val, maxVal, activeMetric), stat };
        })
    : Array.from(areaCentroids.entries())
        .map(([key, pos]) => {
          const stat = areaStats.get(key);
          const val = stat?.[activeMetric] ?? 0;
          return { key, cx: pos[0], cy: pos[1], r: bubbleR(val, maxVal, activeMetric), stat };
        })
  ).filter((b) => b.stat && b.r > 0);

  // Resolve overlaps
  const bubbleEntries = resolveOverlaps(rawBubbles);

  const fmtValue = (val: number) => {
    return Math.round(val).toLocaleString();
  };

  const totalMetric = displayData.reduce((s, d) => s + d[activeMetric], 0);

  return (
    <div className="p-2 relative">

      {/* 상세 지도 보기 버튼 - left top */}
      <button
        type="button"
        onClick={() => onShowDetailMap?.()}
        className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors duration-150"
      >
        상세 지도 보기 →
      </button>

      {/* Metric selector - right top.
       *  Active pill picks up the same metric color as the bubbles below, so the
       *  whole card reads as one theme when the user toggles. */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 items-end">
        {METRICS.map((m) => {
          const isActive = activeMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors duration-150",
                isActive
                  ? TOGGLE_ACTIVE_CLASSES[m.key]
                  : "bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Map + overlays — fixed aspect ratio so the map keeps its proportions regardless of column width.
       *  maxHeight caps how tall the map can grow inside its card so the
       *  parent container's footprint never changes. */}
      <div className="relative" style={{ marginTop: 20, width: "100%", aspectRatio: `${W} / ${H}`, maxHeight: 430 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible" }}>

          <defs>
            {/* Province fill — translucent white wash so the silhouette
             *  reads as a luminous cutout of the dark card surface, not a
             *  separate slate island. Alpha is baked into the stops so the
             *  path itself omits `fillOpacity`. */}
            {/* Province fill — moderate wash. Provides backdrop so neon
             *  routes (bubble connection lines) stand out. Not too dark
             *  (kills visibility), not too bright (no contrast for neon). */}
            <linearGradient id="map-fill-grad" gradientUnits="userSpaceOnUse"
              x1={W} y1={150} x2={0} y2={H - 150}>
              <stop offset="0%"   stopColor="rgba(255,255,255,0.75)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
            </linearGradient>
            <linearGradient id="map-fill-grad-hov" gradientUnits="userSpaceOnUse"
              x1={W} y1={150} x2={0} y2={H - 150}>
              <stop offset="0%"   stopColor={`color-mix(in srgb, ${metricCfg.color} 14%, rgba(255,255,255,0.85))`} />
              <stop offset="100%" stopColor={`color-mix(in srgb, ${metricCfg.color} 8%, rgba(255,255,255,0.70))`} />
            </linearGradient>
            {/* Diagonal gradient (top-left → bottom-right) — simulates natural
             *  ambient light from upper-left, the modern flat-design default.
             *  Soft contrast (95%→100%) keeps the bubble reading as a single
             *  surface rather than a glossy ball. */}
            <linearGradient id="map-bubble-grad" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%"   style={{ stopColor: `color-mix(in srgb, ${metricCfg.color} 75%, white)` }} />
              <stop offset="100%" style={{ stopColor: metricCfg.color }} />
            </linearGradient>
            <linearGradient id="map-bubble-grad-active" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%"   style={{ stopColor: `color-mix(in srgb, ${metricCfg.hoverColor} 75%, white)` }} />
              <stop offset="100%" style={{ stopColor: metricCfg.hoverColor }} />
            </linearGradient>
            <filter id="map-bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor={metricCfg.shadow} floodOpacity={0.32} />
            </filter>
          </defs>

          {/* Map background — none. Card-level gradient (.glass-card-dark)
           *  provides surface depth; layering an SVG wash on top creates
           *  a visible "hot spot" that breaks card cohesion. */}

          {/* Province shapes */}
          {geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            const isHov = hoveredRegions.has(key);
            const isJeju = key === "제주";
            return (
              <path key={i} d={d}
                fill={isHov ? "url(#map-fill-grad-hov)" : "url(#map-fill-grad)"}
                stroke={isHov
                  ? `color-mix(in srgb, ${metricCfg.color} 50%, white)`
                  : "#D5DCE6"}
                strokeWidth={isHov ? 1.5 : 1}
                strokeLinejoin="round"
                className="transition-all duration-200 cursor-pointer"
                transform={isJeju ? "translate(0, -160)" : undefined}
                onMouseEnter={() => {
                  if (mode === "area") setHovered(REGION_TO_AREA[key] ?? null);
                  else setHovered(key);
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Area borders on hover */}
          {mode === "area" && hovered && AREA_GROUPS[hovered] && geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key || !AREA_GROUPS[hovered].members.includes(key)) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            return <path key={`ah-${i}`} d={d} fill="none" stroke={metricCfg.color} strokeWidth="1.2" strokeOpacity="0.4" className="pointer-events-none" />;
          })}


          {/* Bubbles — small first so big ones render on top */}
          {[...bubbleEntries]
            .sort((a, b) => a.r - b.r)
            .map(({ key, cx, cy, r, stat }) => {
              const s = stat!;
              const isHov = hovered === key;
              const isSelected = selectedRegion === key;
              const isDimmed = selectedRegion != null && !isSelected;
              const val = s[activeMetric];
              const pct = totalMetric > 0 ? ((val / totalMetric) * 100).toFixed(1) : "0";
              const label = mode === "area" ? AREA_GROUPS[key]?.label ?? key : key;
              const big = r > 20;

              return (
                <g key={key} className="cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isDimmed ? 0.35 : 1 }}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegionClick?.(isSelected ? null : key);
                  }}>

                  {/* Selection / Hover ring — uses the deepest metric tone for
                   *  contrast against the lighter bubble fill. */}
                  {(isHov || isSelected) && (
                    <circle cx={cx} cy={cy} r={r * 1.2 + 4}
                      fill="none" stroke={metricCfg.ring} strokeWidth={isSelected ? 3 : 2} strokeOpacity={isSelected ? 0.85 : 0.4}
                      className="pointer-events-none transition-all duration-200 ease-out" />
                  )}
                  {/* Bubble */}
                  <circle cx={cx} cy={cy} r={isHov || isSelected ? r * 1.2 : r}
                    fill={isHov || isSelected ? "url(#map-bubble-grad-active)" : "url(#map-bubble-grad)"}
                    stroke="rgba(255,255,255,0.7)" strokeWidth={isHov || isSelected ? 1.5 : 0.8}
                    filter="url(#map-bubble-shadow)"
                    className="transition-all duration-200 ease-out" />

                  {/* Value */}
                  <text x={cx} y={big ? cy - 8 : cy - 1} textAnchor="middle"
                    fill="#1E3A8A" className="pointer-events-none transition-all duration-200 ease-out">
                    <tspan fontSize={38} fontWeight={800}>{fmtValue(val)}</tspan>
                  </text>

                  {/* Label — unified dark navy (`#1E3A8A`) across all bubbles
                   *  for one typographic system. Opacity flexes by context:
                   *  inside-bubble labels lighter (don't fight the number),
                   *  outside-bubble labels nearly opaque (need contrast on map base). */}
                  {big ? (
                    <text x={cx} y={cy + 36} textAnchor="middle"
                      fontSize={28} fontWeight={600}
                      fill="#1E3A8A"
                      fillOpacity={0.85}
                      style={{ letterSpacing: "-0.01em" }}
                      className="pointer-events-none transition-all duration-200 ease-out">
                      {label}
                    </text>
                  ) : (
                    <text x={cx} y={cy + r + 22} textAnchor="middle"
                      fontSize={28} fontWeight={600}
                      fill="#1E3A8A"
                      fillOpacity={isHov ? 1 : 0.95}
                      style={{ letterSpacing: "-0.01em" }}
                      className="pointer-events-none transition-all duration-200 ease-out">
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

          {/* 해외 — 고정 크기 섬 + 버블 */}
          {overseasStat && overseasStat.count > 0 && (() => {
            const ix = 720;
            const iy = H - 80;
            const val = overseasStat[activeMetric];
            const isHov = hovered === "해외";
            const isSelected = selectedRegion === "해외";
            const isDimmed = selectedRegion != null && !isSelected;
            const br = 45;
            return (
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHovered("해외")}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onRegionClick?.(selectedRegion === "해외" ? null : "해외")}
              >
                {/* Box background — metric-tinted glass container */}
                <rect x={ix - 90} y={iy - 85} width={230} height={175} rx={16}
                  fill={`color-mix(in srgb, ${metricCfg.color} 6%, transparent)`}
                  stroke="#FFFFFF"
                  strokeWidth={6}
                  strokeDasharray="4 4"
                  strokeOpacity={1} />
                {/* Label */}
                <text x={ix + 25} y={iy - 40} textAnchor="middle"
                  fontSize={28} fontWeight={600}
                  fill="#1E3A8A"
                  fillOpacity={isHov ? 1 : 0.95}
                  style={{ letterSpacing: "-0.01em" }}
                  className="pointer-events-none transition-all duration-200 ease-out">
                  해외
                </text>
                {/* Hover ring — same `metricCfg.ring` as domestic bubbles for
                 *  consistent metric theming across the map. */}
                {isHov && (
                  <circle cx={ix + 25} cy={iy + 20} r={br * 1.2 + 4}
                    fill="none" stroke={metricCfg.ring} strokeWidth="2" strokeOpacity="0.4"
                    className="pointer-events-none" />
                )}
                {/* Selected ring */}
                {isSelected && (
                  <circle cx={ix + 25} cy={iy + 20} r={br + 6}
                    fill="none" stroke={metricCfg.ring} strokeWidth="3"
                    className="pointer-events-none" />
                )}
                {/* Bubble */}
                <circle cx={ix + 25} cy={iy + 20} r={isHov ? br * 1.2 : br}
                  fill={isHov || isSelected ? "url(#map-bubble-grad-active)" : "url(#map-bubble-grad)"}
                  opacity={isDimmed ? 0.4 : 1}
                  stroke="rgba(255,255,255,0.7)" strokeWidth={isHov ? 1.5 : 0.8}
                  filter="url(#map-bubble-shadow)"
                  className="transition-all duration-200"
                />
                <text x={ix + 25} y={iy + 20} textAnchor="middle" dominantBaseline="middle"
                  fill="#1E3A8A"
                  className="pointer-events-none">
                  <tspan fontSize={38} fontWeight={800}>{fmtValue(val)}</tspan>
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Info panel */}
        {(() => {
          const hovStat = getHoveredStat();
          const isTotal = !hovStat;
          const label = isTotal
            ? "전체 현황"
            : mode === "area"
              ? AREA_GROUPS[hovered!]?.label ?? hovered!
              : hovered!;
          const members = !isTotal && mode === "area" ? AREA_GROUPS[hovered!]?.members.join(", ") : null;
          const stat = hovStat ?? {
            region: "전체", count: data.reduce((s, d) => s + d.count, 0),
            total_headcount: data.reduce((s, d) => s + d.total_headcount, 0),
            total_contract: data.reduce((s, d) => s + d.total_contract, 0),
            avg_progress: (() => { const t = data.reduce((s, d) => s + d.count, 0); const sum = data.reduce((s, d) => s + d.avg_progress * d.count, 0); return t > 0 ? sum / t : 0; })(),
          };
          return null;
        })()}
      </div>
    </div>
  );
});
