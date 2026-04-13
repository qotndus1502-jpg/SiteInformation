"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteDashboard } from "@/types/database";
import { charts } from "@/lib/chart-colors";

export type ColorCategory = "corporation" | "division" | "status";

interface SiteMapProps {
  sites: SiteDashboard[];
  selectedSiteId: number | null;
  onSelect: (site: SiteDashboard) => void;
  colorCategory?: ColorCategory;
}

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#f2f3f0" } },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water",
      paint: { "fill-color": "#c2c8ca" } },
    { id: "landuse_residential", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["==", ["get", "class"], "residential"],
      paint: { "fill-color": "#eaeae6", "fill-opacity": 0.7 } },
    { id: "park", type: "fill", source: "openmaptiles", "source-layer": "park",
      paint: { "fill-color": "#e6e9e5" } },
    { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", minzoom: 12,
      paint: { "fill-color": "#eaeae5", "fill-outline-color": "#dbdbda" } },
    { id: "road_minor", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 10,
      filter: ["match", ["get", "class"], ["minor", "service", "track", "path"], true, false],
      paint: { "line-color": "#ddd", "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 0.5, 18, 8] } },
    { id: "road_major", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 6,
      filter: ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#fff", "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 6, 0.5, 18, 16] } },
    { id: "road_motorway", type: "line", source: "openmaptiles", "source-layer": "transportation", minzoom: 5,
      filter: ["==", ["get", "class"], "motorway"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#fff", "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 5, 1, 18, 24] } },
    { id: "boundary_country", type: "line", source: "openmaptiles", "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 2],
      paint: { "line-color": "#b3b3b3", "line-width": 1.5 } },
    { id: "boundary_state", type: "line", source: "openmaptiles", "source-layer": "boundary", minzoom: 4,
      filter: ["all", [">=", ["get", "admin_level"], 3], ["<=", ["get", "admin_level"], 6]],
      paint: { "line-color": "#ccc", "line-dasharray": [2, 2], "line-width": 1 } },
    { id: "label_city", type: "symbol", source: "openmaptiles", "source-layer": "place", minzoom: 4,
      filter: ["==", ["get", "class"], "city"],
      layout: {
        "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 10, 16],
        "text-max-width": 8,
      },
      paint: { "text-color": "#333", "text-halo-color": "#fff", "text-halo-width": 1.2 } },
    { id: "label_town", type: "symbol", source: "openmaptiles", "source-layer": "place", minzoom: 7,
      filter: ["==", ["get", "class"], "town"],
      layout: {
        "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 12, 14],
        "text-max-width": 8,
      },
      paint: { "text-color": "#444", "text-halo-color": "#fff", "text-halo-width": 1 } },
    { id: "label_village", type: "symbol", source: "openmaptiles", "source-layer": "place", minzoom: 10,
      filter: ["==", ["get", "class"], "village"],
      layout: {
        "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-max-width": 8,
      },
      paint: { "text-color": "#555", "text-halo-color": "#fff", "text-halo-width": 1 } },
    { id: "label_road", type: "symbol", source: "openmaptiles", "source-layer": "transportation_name", minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
      },
      paint: { "text-color": "#666", "text-halo-color": "#fff", "text-halo-width": 1 } },
    { id: "label_country", type: "symbol", source: "openmaptiles", "source-layer": "place", maxzoom: 8,
      filter: ["==", ["get", "class"], "country"],
      layout: {
        "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 6, 18],
      },
      paint: { "text-color": "#000", "text-halo-color": "#fff", "text-halo-width": 1.5 } },
  ],
};

/* 범례와 동일한 배열에서 key→color lookup 생성. 이 Map을 바꾸려면
   chart-colors.ts의 siteMap 배열에서 엔트리를 수정하면 된다. */
const CORP_COLORS = Object.fromEntries(charts.siteMap.corporation.map((e) => [e.key, e.color]));
const DIV_COLORS = Object.fromEntries(charts.siteMap.division.map((e) => [e.key, e.color]));
const STATUS_COLORS = Object.fromEntries(charts.siteMap.status.map((e) => [e.key, e.color]));

const DEFAULT_COLOR = charts.siteMap.fallback;

function getSiteColor(site: { corporation_name: string; division: string; status: string }, category: ColorCategory): string {
  if (category === "corporation") return CORP_COLORS[site.corporation_name] ?? DEFAULT_COLOR;
  if (category === "division") return DIV_COLORS[site.division] ?? DEFAULT_COLOR;
  return STATUS_COLORS[site.status] ?? DEFAULT_COLOR;
}

const DEFAULT_CENTER: [number, number] = [127.8, 35.9];
const DEFAULT_ZOOM = 7;
const MIN_ZOOM = 2;
const MAX_BOUNDS: [number, number, number, number] = [115, 28, 140, 45];

const SOURCE_ID = "sites-source";
const CIRCLE_LAYER = "sites-circle";
const CIRCLE_STROKE_LAYER = "sites-circle-stroke";
const SELECTED_LAYER = "sites-selected";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "진행중", COMPLETED: "준공", SUSPENDED: "중지", PRE_START: "착공전",
};

// Tag colors mirror the SiteDetail badge palette (Badge variants:
// success / brand / orange / warning / gray)
const COMPANY_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  "남광토건": { bg: "#F0FDF4", text: "#15803D" }, // success
  "극동건설": { bg: "#EFF6FF", text: "#1D4ED8" }, // brand
  "금광기업": { bg: "#FFF7ED", text: "#C2410C" }, // orange
};
const STATUS_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  "ACTIVE":    { bg: "#EFF6FF", text: "#1D4ED8" }, // brand
  "PRE_START": { bg: "#FFF7ED", text: "#C2410C" }, // orange
  "COMPLETED": { bg: "#F1F5F9", text: "#64748B" }, // gray
  "SUSPENDED": { bg: "#FEFCE8", text: "#A16207" }, // warning
};
const GRAY_TAG = { bg: "#F1F5F9", text: "#64748B" };

function tagSpan(label: string, colors: { bg: string; text: string }): string {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:500;background:${colors.bg};color:${colors.text};margin-right:3px;margin-top:3px;white-space:nowrap;line-height:1.4;">${label}</span>`;
}

function buildPopupHTML(name: string, corp: string, division: string, status: string, amount: number | null, jvSummary: string | null) {
  const amountStr = amount != null ? `${Math.round(amount).toLocaleString()}억` : "-";

  const tagsHtml = [
    corp ? tagSpan(corp, COMPANY_TAG_COLORS[corp] ?? GRAY_TAG) : "",
    division ? tagSpan(division, GRAY_TAG) : "",
    status ? tagSpan(STATUS_LABEL[status] ?? status, STATUS_TAG_COLORS[status] ?? GRAY_TAG) : "",
  ].join("");

  // 자사 도급액 — 주도급사(자사 중 지분 1위) 1개만 표시. 회사명 없이 금액 + 퍼센트만.
  let leadStr = "-";
  if (amount != null && jvSummary) {
    const regex = /(남광토건|극동건설|금광기업)\s+([\d.]+)%/g;
    const matches = [...jvSummary.matchAll(regex)];
    if (matches.length > 0) {
      const lead = matches
        .map((m) => ({ name: m[1], pct: parseFloat(m[2]) }))
        .sort((a, b) => b.pct - a.pct)[0];
      const leadAmount = Math.round(amount * lead.pct / 100);
      leadStr = `${leadAmount.toLocaleString()}억 (${Math.round(lead.pct)}%)`;
    }
  }

  return `
    <div style="padding:6px 10px;min-width:160px;max-width:260px;font-family:var(--font-sans,sans-serif);">
      <strong style="font-size:13px;line-height:1.25;color:#0f172a;white-space:nowrap;">${name}</strong>
      <div style="margin-top:2px;">${tagsHtml}</div>
      <div style="margin-top:5px;font-size:11px;color:#64748b;font-weight:500;">
        공사금액 <span style="color:#0f172a;font-weight:700;font-size:12px;">${amountStr}</span>
      </div>
      <div style="margin-top:2px;font-size:11px;color:#64748b;font-weight:500;">
        자사도급액 <span style="color:#2563eb;font-weight:700;font-size:12px;">${leadStr}</span>
      </div>
    </div>
  `;
}

function buildGeoJSON(sites: SiteDashboard[], selectedSiteId: number | null, colorCategory: ColorCategory = "corporation") {
  /* 동일 좌표 겹침 해소: 같은 (lat,lon)에 여러 현장이 있으면 아주 작은
     원 위에 분산 배치한다. 50% overlap 허용 — 완전 중첩만 방지. */
  const valid = sites.filter((s) => s.latitude != null && s.longitude != null);
  const groups = new Map<string, SiteDashboard[]>();
  for (const s of valid) {
    const key = `${s.latitude!.toFixed(5)},${s.longitude!.toFixed(5)}`;
    const arr = groups.get(key);
    if (arr) arr.push(s); else groups.set(key, [s]);
  }
  const jitter = new Map<number, [number, number]>();
  for (const arr of groups.values()) {
    if (arr.length <= 1) continue;
    const R = 0.008;
    for (let i = 0; i < arr.length; i++) {
      const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
      jitter.set(arr[i].id, [Math.cos(angle) * R, Math.sin(angle) * R]);
    }
  }

  const features = valid
    .map((s) => {
      const off = jitter.get(s.id);
      const lon = s.longitude! + (off ? off[0] : 0);
      const lat = s.latitude!  + (off ? off[1] : 0);
      return {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [lon, lat],
      },
      properties: {
        id: s.id,
        site_name: s.site_name,
        corporation_name: s.corporation_name,
        contract_amount: s.contract_amount,
        division: s.division ?? "",
        facility_type_name: s.facility_type_name ?? "",
        order_type: s.order_type ?? "",
        status: s.status ?? "",
        jv_summary: s.jv_summary ?? "",
        color: getSiteColor({ corporation_name: s.corporation_name, division: s.division ?? "", status: s.status }, colorCategory),
        selected: s.id === selectedSiteId ? 1 : 0,
      },
      };
    });
  return { type: "FeatureCollection" as const, features };
}

export function SiteMap({ sites, selectedSiteId, onSelect, colorCategory = "corporation" }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const sitesRef = useRef(sites);
  onSelectRef.current = onSelect;
  sitesRef.current = sites;

  /* 선택 마커 (DOM — 핀 모양, 1개만) */
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);

  /* Show a popup on the side opposite the marker (so it never overlaps the pin
     and never falls off the right edge where the detail card lives). */
  const showPopup = useCallback((lngLat: [number, number], html: string) => {
    const map = mapRef.current;
    if (!map) return;
    const point = map.project(lngLat);
    const width = map.getCanvas().clientWidth;
    // If marker is in the left half → put popup on its right (anchor "left").
    // If marker is in the right half → put popup on its left (anchor "right").
    const anchor: "left" | "right" = point.x < width / 2 ? "left" : "right";
    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({
      closeOnClick: false,
      closeButton: false,
      anchor,
      offset: 24,
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);
  }, []);

  /* 지도 초기화 */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxBounds: MAX_BOUNDS,
      scrollZoom: false,
    });

    // Scrollytelling: 커스텀 wheel → flyTo 애니메이션
    let targetZoom = DEFAULT_ZOOM;
    const container = containerRef.current;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.003;
      targetZoom = Math.max(MIN_ZOOM, Math.min(18, targetZoom + delta));
      map.flyTo({
        zoom: targetZoom,
        speed: 1.8,
        curve: 1.2,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    };
    container.addEventListener("wheel", wheelHandler, { passive: false });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    // Popup is recreated on each show via showPopup() so its anchor (left/right of pin)
    // can be picked dynamically based on the marker's screen position.

    map.on("load", () => {
      // GeoJSON source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: buildGeoJSON(sitesRef.current, null, colorCategory),
      });

      // 비선택 원형 — 흰색 테두리
      map.addLayer({
        id: CIRCLE_STROKE_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "selected"], 0],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 8, 12, 12, 18, 16, 26],
          "circle-color": "#ffffff",
          "circle-opacity": 1,
        },
      });

      // 비선택 원형 — 법인 색상
      map.addLayer({
        id: CIRCLE_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "selected"], 0],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 8, 10, 12, 15, 16, 22],
          "circle-color": ["get", "color"],
          "circle-opacity": 1,
        },
      });

      // 클릭 이벤트
      map.on("click", CIRCLE_LAYER, (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const siteId = feature.properties?.id;
        const site = sitesRef.current.find((s) => s.id === siteId);
        if (site) onSelectRef.current(site);
      });

      // hover 팝업
      map.on("mouseenter", CIRCLE_LAYER, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature || !feature.geometry || feature.geometry.type !== "Point") return;
        const props = feature.properties!;
        showPopup(
          feature.geometry.coordinates as [number, number],
          buildPopupHTML(props.site_name, props.corporation_name, props.division, props.status, props.contract_amount, props.jv_summary)
        );
      });

      map.on("mouseleave", CIRCLE_LAYER, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
    });

    return () => {
      container.removeEventListener("wheel", wheelHandler);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* 데이터/선택 변경 시 source 업데이트 + 선택 핀 */
  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(SOURCE_ID)) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    source.setData(buildGeoJSON(sites, selectedSiteId, colorCategory));

    // 현장들의 bounds로 자동 이동
    const validSites = sites.filter((s) => s.latitude != null && s.longitude != null);
    if (validSites.length > 0 && !selectedSiteId) {
      const lngs = validSites.map((s) => s.longitude!);
      const lats = validSites.map((s) => s.latitude!);
      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 800 });
    }

    // 기존 선택 핀 제거
    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    // 선택된 현장 핀 마커
    const selectedSite = sites.find((s) => s.id === selectedSiteId);
    if (selectedSite?.latitude != null && selectedSite?.longitude != null) {
      const color = getSiteColor(
        {
          corporation_name: selectedSite.corporation_name,
          division: selectedSite.division ?? "",
          status: selectedSite.status,
        },
        colorCategory
      );
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `<svg viewBox="0 0 24 32" width="36" height="44">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>`;

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([selectedSite.longitude!, selectedSite.latitude!])
        .addTo(map);

      selectedMarkerRef.current = marker;

      // 선택 핀 팝업
      showPopup(
        [selectedSite.longitude!, selectedSite.latitude!],
        buildPopupHTML(selectedSite.site_name, selectedSite.corporation_name, selectedSite.division, selectedSite.status, selectedSite.contract_amount, selectedSite.jv_summary ?? null)
      );
    }
  }, [sites, selectedSiteId, colorCategory, showPopup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded() && map.getSource(SOURCE_ID)) {
      updateSource();
    } else {
      const onLoad = () => updateSource();
      map.on("load", onLoad);
      return () => { map.off("load", onLoad); };
    }
  }, [updateSource]);

  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-280px)] min-h-[400px]"
      />
    </div>
  );
}
