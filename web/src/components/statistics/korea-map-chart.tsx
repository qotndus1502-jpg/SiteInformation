"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";

/* ── Types ──────────────────────────────────────────────── */

interface RegionStat {
  region: string;
  count: number;
  total_contract: number;
  total_headcount: number;
  avg_progress: number;
}

interface SitePoint {
  id: number;
  site_name: string;
  latitude: number | null;
  longitude: number | null;
  corporation_name: string;
  division: string;
  status: string;
}

interface KoreaMapChartProps {
  data: RegionStat[];
  sites?: SitePoint[];
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

/* ── Province fill colors ─────────────────────────────── */

const FILL: Record<string, string> = {
  "서울": "#CBD5E1", "인천": "#CBD5E1", "경기": "#D6DEE8",
  "강원": "#E2E8F0", "충북": "#D6DEE8", "충남": "#CBD5E1",
  "세종": "#D6DEE8", "대전": "#D6DEE8", "전북": "#CBD5E1",
  "전남": "#B8C4D0", "광주": "#CBD5E1", "경북": "#E2E8F0",
  "경남": "#D6DEE8", "대구": "#D6DEE8", "울산": "#E2E8F0",
  "부산": "#CBD5E1",
  "제주": "#D6DEE8",
};

/* ── Minimal nudges (only where centroid is very off) ── */

const NUDGE: Record<string, { dx: number; dy: number }> = {
  "인천": { dx: -25, dy: 20 },
  "서울": { dx: -10, dy: -25 },
  "광주": { dx: -8, dy: 0 },
  "제주": { dx: 0, dy: -160 },
};

/* ── Metric config ────────────────────────────────────── */

type MetricKey = "count" | "total_headcount" | "total_contract";

const METRICS: { key: MetricKey; label: string; color: string; hoverColor: string; unit: string }[] = [
  { key: "count", label: "현장 수", color: "#2563EB", hoverColor: "#1D4ED8", unit: "개" },
  { key: "total_headcount", label: "투입 인원", color: "#3B82F6", hoverColor: "#2563EB", unit: "명" },
  { key: "total_contract", label: "자사도급액", color: "#3B82F6", hoverColor: "#2563EB", unit: "억" },
];

/* ── Color category config ────────────────────────────── */

type ColorCategory = "corporation" | "division" | "status";

const COLOR_CATEGORIES: { key: ColorCategory; label: string }[] = [
  { key: "corporation", label: "법인별" },
  { key: "division", label: "부문별" },
  { key: "status", label: "상태별" },
];

const CORP_MARKER_COLORS: Record<string, string> = {
  "남광토건": "#3B82F6",
  "극동건설": "#3B82F6",
  "금광기업": "#3B82F6",
};

const DIV_MARKER_COLORS: Record<string, string> = {
  "건축": "#2563EB",
  "토목": "#F97316",
};

const STATUS_MARKER_COLORS: Record<string, string> = {
  "ACTIVE": "#2563EB",
  "PRE_START": "#F59E0B",
  "COMPLETED": "#22C55E",
  "SUSPENDED": "#EF4444",
};

const STATUS_MARKER_LABELS: Record<string, string> = {
  "ACTIVE": "진행중",
  "PRE_START": "착공전",
  "COMPLETED": "준공",
  "SUSPENDED": "중지",
};

function getSiteColor(site: SitePoint, category: ColorCategory): string {
  if (category === "corporation") return CORP_MARKER_COLORS[site.corporation_name] ?? "#94A3B8";
  if (category === "division") return DIV_MARKER_COLORS[site.division] ?? "#94A3B8";
  return STATUS_MARKER_COLORS[site.status] ?? "#94A3B8";
}

function getCategoryLegend(category: ColorCategory): { label: string; color: string }[] {
  if (category === "corporation") return Object.entries(CORP_MARKER_COLORS).map(([k, v]) => ({ label: k, color: v }));
  if (category === "division") return Object.entries(DIV_MARKER_COLORS).map(([k, v]) => ({ label: k, color: v }));
  return Object.entries(STATUS_MARKER_COLORS).map(([k, v]) => ({ label: STATUS_MARKER_LABELS[k] ?? k, color: v }));
}

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

export function KoreaMapChart({ data: initialData, sites: initialSites }: KoreaMapChartProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [data, setData] = useState<RegionStat[]>(initialData);
  const [sites, setSites] = useState<SitePoint[]>(initialSites ?? []);
  const [mode, setMode] = useState<ViewMode>("region");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("count");
  const [colorCategory, setColorCategory] = useState<ColorCategory>("corporation");

  useEffect(() => {
    fetch("/korea-provinces.json").then((r) => r.json()).then(setGeo).catch(() => {});
  }, []);

  // Fetch sites if not provided
  useEffect(() => {
    if (initialSites && initialSites.length > 0) { setSites(initialSites); return; }
    fetch(`${API_BASE}/api/sites`)
      .then((r) => r.json())
      .then((d) => setSites(d))
      .catch(() => {});
  }, [initialSites]);

  useEffect(() => {
    if (initialData.length > 0) { setData(initialData); return; }
    fetch(`${API_BASE}/api/statistics/summary`)
      .then((r) => r.json())
      .then((d) => { if (d.by_region?.length) setData(d.by_region); })
      .catch(() => {});
  }, [initialData]);

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

  const { pathGen, centroids, projection } = useMemo(() => {
    if (!geo) return { pathGen: null, centroids: new Map<string, [number, number]>(), projection: null };
    const projection = geoMercator().center([127.8, 36.2]).scale(13000).translate([W / 2, H / 2 + 130]);
    const pg = geoPath().projection(projection);
    const cm = new Map<string, [number, number]>();
    for (const feature of geo.features) {
      const name = feature.properties?.name as string;
      const key = NAME_MAP[name];
      if (!key) continue;
      const c = geoCentroid(feature as Feature<Geometry>);
      const projected = projection(c);
      if (projected) cm.set(key, projected as [number, number]);
    }
    return { pathGen: pg, centroids: cm, projection };
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
    return (
      <div className="bg-card border border-border rounded-xl p-2 shadow-sm flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
      </div>
    );
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
    if (activeMetric === "total_contract") return `${Math.round(val / 100)}`;
    return val.toLocaleString();
  };

  const totalMetric = displayData.reduce((s, d) => s + d[activeMetric], 0);

  const totalSiteCount = data.reduce((s, d) => s + d.count, 0);
  const totalHeadCount = data.reduce((s, d) => s + d.total_headcount, 0);
  const totalContract = data.reduce((s, d) => s + d.total_contract, 0);

  const validSites = sites.filter((s) => s.latitude != null && s.longitude != null);
  const legendItems = getCategoryLegend(colorCategory);

  return (
    <div className="p-2 relative">

      {/* Unit label - left top */}
      <div className="absolute top-3 left-3 z-20 text-[12px] text-muted-foreground font-medium">
        (단위: {activeMetric === "count" ? "개" : activeMetric === "total_headcount" ? "명" : "백억"})
      </div>

      {/* Metric selector - right top */}
      <div className="absolute top-3 right-10 z-20 flex flex-col gap-0">
        {METRICS.map((m) => {
          const isActive = activeMetric === m.key;
          const val = m.key === "count" ? totalSiteCount : m.key === "total_headcount" ? totalHeadCount : totalContract;
          const display = m.key === "total_contract" ? `${Math.round(val).toLocaleString()}억` : `${val.toLocaleString()}${m.unit}`;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "flex items-center justify-between gap-2 px-2 py-1 text-[12px] font-medium transition-all text-left",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map + overlays */}
      <div className="relative" style={{ marginTop: 35 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 550, overflow: "visible" }}>

          {/* Province shapes */}
          {geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            const isHov = hoveredRegions.has(key);
            const fill = FILL[key] ?? "#b0c4b2";

            const isJeju = key === "제주";
            return (
              <path key={i} d={d}
                fill={fill} fillOpacity={isHov ? 1 : 0.65}
                stroke="white" strokeWidth={isHov ? 3.5 : 3}
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

          {/* Outlines */}
          {geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            const isJeju = key === "제주";
            return <path key={`o-${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" className="pointer-events-none" transform={isJeju ? "translate(0, -160)" : undefined} />;
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
              const val = s[activeMetric];
              const pct = totalMetric > 0 ? ((val / totalMetric) * 100).toFixed(1) : "0";
              const label = mode === "area" ? AREA_GROUPS[key]?.label ?? key : key;
              const big = r > 20;

              return (
                <g key={key} className="cursor-pointer"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}>

                  {/* Shadow for depth */}
                  <circle cx={cx + 1} cy={cy + 1.5} r={isHov ? r * 1.2 : r}
                    fill="rgba(0,0,0,0.12)" className="pointer-events-none transition-all duration-200" />

                  {/* Hover ring */}
                  {isHov && (
                    <circle cx={cx} cy={cy} r={r * 1.2 + 4}
                      fill="none" stroke={metricCfg.color} strokeWidth="2" strokeOpacity="0.4"
                      className="pointer-events-none" />
                  )}
                  {/* Bubble */}
                  <circle cx={cx} cy={cy} r={isHov ? r * 1.2 : r}
                    fill={isHov ? metricCfg.hoverColor : metricCfg.color}
                    fillOpacity={isHov ? 0.95 : 0.8}
                    stroke="white" strokeWidth={isHov ? 2 : 0.8}
                    className="transition-all duration-200" />

                  {/* Value */}
                  <text x={cx} y={big ? cy - 4 : cy - 1} textAnchor="middle"
                    fill="#fff" className="pointer-events-none">
                    <tspan fontSize={38} fontWeight={800}>{fmtValue(val)}</tspan>
                  </text>

                  {/* Label */}
                  {big ? (
                    <text x={cx} y={cy + 28} textAnchor="middle"
                      fontSize={28} fontWeight={600}
                      fill="rgba(255,255,255,0.8)" className="pointer-events-none">
                      {label}
                    </text>
                  ) : (
                    <text x={cx} y={cy + r + 10} textAnchor="middle"
                      fontSize={28} fontWeight={700}
                      fill={isHov ? metricCfg.hoverColor : "#4a5568"}
                      className="pointer-events-none">
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

          {/* 해외 — 고정 크기 섬 + 버블 */}
          {overseasStat && overseasStat.count > 0 && (() => {
            const ix = 550;
            const iy = H + 100;
            const val = overseasStat[activeMetric];
            const isHov = hovered === "해외";
            const br = 45;
            return (
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHovered("해외")}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Box background */}
                <rect x={ix - 90} y={iy - 85} width={230} height={175} rx={16}
                  fill="none" stroke="#CBD5E1" strokeWidth={2}
                  strokeDasharray="6 3" />
                {/* Label */}
                <text x={ix + 25} y={iy - 40} textAnchor="middle"
                  fontSize={28} fontWeight={700}
                  fill={isHov ? metricCfg.hoverColor : "#4a5568"}>
                  해외
                </text>
                {/* Shadow */}
                <circle cx={ix + 26} cy={iy + 21.5} r={isHov ? br * 1.2 : br}
                  fill="rgba(0,0,0,0.12)" className="pointer-events-none transition-all duration-200" />
                {/* Hover ring */}
                {isHov && (
                  <circle cx={ix + 25} cy={iy + 20} r={br * 1.2 + 4}
                    fill="none" stroke={metricCfg.color} strokeWidth="2" strokeOpacity="0.4"
                    className="pointer-events-none" />
                )}
                {/* Bubble */}
                <circle cx={ix + 25} cy={iy + 20} r={isHov ? br * 1.2 : br}
                  fill={isHov ? metricCfg.hoverColor : metricCfg.color}
                  fillOpacity={isHov ? 0.95 : 0.8}
                  stroke="white" strokeWidth={isHov ? 2 : 0.8}
                  className="transition-all duration-200"
                />
                <text x={ix + 25} y={iy + 20} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff"
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
}
