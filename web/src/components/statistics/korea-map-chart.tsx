"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin } from "lucide-react";
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

interface KoreaMapChartProps {
  data: RegionStat[];
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

/* ── Province fill colors (green-teal tones like reference) */

const FILL: Record<string, string> = {
  "서울": "#8ccdc0", "인천": "#7ec5b6", "경기": "#9ad5c8",
  "강원": "#c2e8e0", "충북": "#aeddd4", "충남": "#80c9ba",
  "세종": "#92d0c3", "대전": "#a4d9ce", "전북": "#6ebfae",
  "전남": "#5db5a2", "광주": "#74c3b2", "경북": "#b8e3da",
  "경남": "#a6dcd2", "대구": "#9ed6ca", "울산": "#b4e1d8",
  "부산": "#96d2c6", "제주": "#84cbbe",
};

/* ── Bubble label offsets (manual tuning per region) ──── */

const OFFSETS: Record<string, { dx: number; dy: number }> = {
  "서울": { dx: -25, dy: -22 },
  "인천": { dx: -45, dy: -8 },
  "경기": { dx: 20, dy: -30 },
  "강원": { dx: 10, dy: 0 },
  "충북": { dx: 15, dy: 0 },
  "충남": { dx: -20, dy: 0 },
  "세종": { dx: -5, dy: -20 },
  "대전": { dx: 5, dy: 15 },
  "전북": { dx: -5, dy: 0 },
  "전남": { dx: -10, dy: 5 },
  "광주": { dx: -30, dy: -10 },
  "경북": { dx: 10, dy: 0 },
  "경남": { dx: 0, dy: 5 },
  "대구": { dx: 20, dy: -10 },
  "울산": { dx: 25, dy: 5 },
  "부산": { dx: 20, dy: 10 },
  "제주": { dx: 0, dy: 0 },
};

/* ── Bubble radius ────────────────────────────────────── */

function bubbleR(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return 11 + Math.sqrt(value / max) * 20;
}

/* ── Component ────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

export function KoreaMapChart({ data: initialData }: KoreaMapChartProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [data, setData] = useState<RegionStat[]>(initialData);

  useEffect(() => {
    fetch("/korea-provinces.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => {});
  }, []);

  // If no data passed (server couldn't fetch), load client-side
  useEffect(() => {
    if (initialData.length > 0) { setData(initialData); return; }
    fetch(`${API_BASE}/api/statistics/summary`)
      .then((r) => r.json())
      .then((d) => { if (d.by_region?.length) setData(d.by_region); })
      .catch(() => {});
  }, [initialData]);

  const byRegion = useMemo(() => new Map(data.map((d) => [d.region, d])), [data]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxHead = Math.max(...data.map((d) => d.total_headcount), 1);
  const totalSites = data.reduce((s, d) => s + d.count, 0);
  const totalHead = data.reduce((s, d) => s + d.total_headcount, 0);

  const W = 500;
  const H = 580;

  const { pathGen, centroids } = useMemo(() => {
    if (!geo) return { pathGen: null, centroids: new Map<string, [number, number]>() };

    const projection = geoMercator()
      .center([127.5, 36.0])
      .scale(4800)
      .translate([W / 2, H / 2]);

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
    return { pathGen: pg, centroids: cm };
  }, [geo]);

  if (!geo || !pathGen) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">대한민국 지역별 현장 분포 현황</h3>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: "#7c5cbf" }} />
          현장 수
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: "#5bb5a0" }} />
          투입 인원
        </span>
        <span className="ml-auto text-muted-foreground">
          전체 <span className="font-bold text-foreground">{totalSites}개</span> 현장 ·{" "}
          <span className="font-bold text-foreground">{totalHead.toLocaleString()}명</span>
        </span>
      </div>

      {/* Map container */}
      <div className="relative flex justify-center">
        <svg viewBox={`0 20 ${W} ${H - 20}`} className="w-full max-w-[540px]" style={{ height: "auto" }}>

          {/* Province fills */}
          {geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            const isHov = hovered === key;
            const fill = FILL[key] ?? "#b0c4b2";

            return (
              <path
                key={i}
                d={d}
                fill={fill}
                fillOpacity={isHov ? 1 : 0.7}
                stroke="#fff"
                strokeWidth={isHov ? 2.5 : 1.2}
                className="transition-all duration-200 cursor-pointer"
                style={isHov ? { filter: "brightness(0.85)" } : undefined}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Province outlines (subtle inner border) */}
          {geo.features.map((feature, i) => {
            const name = feature.properties?.name as string;
            const key = NAME_MAP[name];
            if (!key) return null;
            const d = pathGen(feature as Feature<Geometry>);
            if (!d) return null;
            return (
              <path key={`outline-${i}`} d={d}
                fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"
                className="pointer-events-none" />
            );
          })}

          {/* Bubbles — render small ones first, big ones on top */}
          {Array.from(centroids.entries())
            .map(([key, pos]) => ({ key, pos, stat: byRegion.get(key) }))
            .filter((d) => d.stat && d.stat.count > 0)
            .sort((a, b) => (a.stat!.count + a.stat!.total_headcount) - (b.stat!.count + b.stat!.total_headcount))
            .map(({ key, pos, stat }) => {
              const s = stat!;
              const isHov = hovered === key;
              const off = OFFSETS[key] ?? { dx: 0, dy: 0 };

              const rC = bubbleR(s.count, maxCount);
              const rH = bubbleR(s.total_headcount, maxHead);

              const cx = pos[0] + off.dx;
              const cy = pos[1] + off.dy;

              // Purple left, teal right, overlapping
              const bx1 = cx;
              const bx2 = cx + rC * 0.65;

              const pctC = totalSites > 0 ? ((s.count / totalSites) * 100).toFixed(1) : "0";
              const pctH = totalHead > 0 ? ((s.total_headcount / totalHead) * 100).toFixed(1) : "0";

              return (
                <g
                  key={key}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Teal bubble (behind, right) — 투입 인원 */}
                  <circle cx={bx2} cy={cy} r={rH}
                    fill={isHov ? "#3d9e8a" : "#5bb5a0"}
                    stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"
                    className="transition-all duration-200" />
                  {rH >= 13 && (
                    <>
                      <text x={bx2} y={cy - 1} textAnchor="middle"
                        fontSize={rH > 18 ? 11 : 8} fontWeight={700}
                        fill="#fff" className="pointer-events-none">
                        {s.total_headcount.toLocaleString()}
                      </text>
                      <text x={bx2} y={cy + (rH > 18 ? 9 : 7)} textAnchor="middle"
                        fontSize={6} fill="rgba(255,255,255,0.8)" className="pointer-events-none">
                        {pctH}%
                      </text>
                    </>
                  )}

                  {/* Purple bubble (front, left) — 현장 수 */}
                  <circle cx={bx1} cy={cy} r={rC}
                    fill={isHov ? "#5b3a9e" : "#7c5cbf"}
                    stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"
                    className="transition-all duration-200" />
                  <text x={bx1} y={cy - 1} textAnchor="middle"
                    fontSize={rC > 18 ? 12 : 9} fontWeight={800}
                    fill="#fff" className="pointer-events-none">
                    {s.count}
                  </text>
                  <text x={bx1} y={cy + (rC > 18 ? 10 : 7)} textAnchor="middle"
                    fontSize={6} fill="rgba(255,255,255,0.8)" className="pointer-events-none">
                    {pctC}%
                  </text>

                  {/* Region name label */}
                  <text
                    x={cx + rC * 0.3}
                    y={cy + Math.max(rC, rH) + 13}
                    textAnchor="middle" fontSize={9} fontWeight={700}
                    fill={isHov ? "#5b3a9e" : "#4a5568"}
                    className="pointer-events-none"
                  >
                    {key}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Hover detail card */}
        {hovered && (() => {
          const stat = byRegion.get(hovered);
          if (!stat) return null;
          return (
            <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl px-4 py-3 z-10 min-w-[175px]">
              <p className="font-bold text-foreground text-sm mb-2.5">{stat.region}</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#7c5cbf" }} />
                    현장 수
                  </span>
                  <span className="font-bold font-mono text-foreground">{stat.count}개</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5bb5a0" }} />
                    투입 인원
                  </span>
                  <span className="font-bold font-mono text-foreground">{stat.total_headcount.toLocaleString()}명</span>
                </div>
                <div className="border-t border-border my-1" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">도급액</span>
                  <span className="font-bold font-mono text-foreground">{(stat.total_contract ?? 0).toLocaleString()}억</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">평균 공정률</span>
                  <span className="font-bold font-mono text-foreground">{((stat.avg_progress ?? 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
