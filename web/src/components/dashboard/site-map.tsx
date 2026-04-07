"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteDashboard } from "@/types/database";

interface SiteMapProps {
  sites: SiteDashboard[];
  selectedSiteId: number | null;
  onSelect: (site: SiteDashboard) => void;
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

const CORP_COLORS: Record<string, string> = {
  "남광토건": "#22c55e",
  "극동건설": "#3b82f6",
  "금광기업": "#f97316",
};
const DEFAULT_COLOR = "#6b7280";

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

function buildPopupHTML(name: string, corp: string, division: string, facilityType: string, orderType: string, status: string, amount: number | null) {
  const amountStr = amount != null ? `${Math.round(amount).toLocaleString()}억` : "-";
  const tagStyle = `display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500;background:#eff6ff;color:#2563eb;margin-right:4px;margin-top:4px;white-space:nowrap;`;
  const tags = [corp, division, facilityType, orderType, STATUS_LABEL[status] ?? status].filter(Boolean);
  return `
    <div style="padding:8px 12px;min-width:200px;max-width:280px;font-family:var(--font-sans,sans-serif);">
      <strong style="font-size:var(--text-md);line-height:1.3;white-space:nowrap;">${name}</strong>
      <div style="margin-top:4px;">${tags.map((t) => `<span style="${tagStyle}">${t}</span>`).join("")}</div>
      <div style="margin-top:6px;font-size:var(--text-sm);color:#2563eb;font-weight:600;">도급액 ${amountStr}</div>
    </div>
  `;
}

function buildGeoJSON(sites: SiteDashboard[], selectedSiteId: number | null) {
  const features = sites
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [s.longitude!, s.latitude!],
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
        color: CORP_COLORS[s.corporation_name] ?? DEFAULT_COLOR,
        selected: s.id === selectedSiteId ? 1 : 0,
      },
    }));
  return { type: "FeatureCollection" as const, features };
}

export function SiteMap({ sites, selectedSiteId, onSelect }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  const sitesRef = useRef(sites);
  onSelectRef.current = onSelect;
  sitesRef.current = sites;

  /* 선택 마커 (DOM — 핀 모양, 1개만) */
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);

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
    popupRef.current = new maplibregl.Popup({ closeOnClick: false, offset: 14, closeButton: false });

    map.on("load", () => {
      // GeoJSON source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: buildGeoJSON(sitesRef.current, null),
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
        popupRef.current
          ?.setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(buildPopupHTML(props.site_name, props.corporation_name, props.division, props.facility_type_name, props.order_type, props.status, props.contract_amount))
          .addTo(map);
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
    source.setData(buildGeoJSON(sites, selectedSiteId));

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
      const color = CORP_COLORS[selectedSite.corporation_name] ?? DEFAULT_COLOR;
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
      popupRef.current
        ?.setLngLat([selectedSite.longitude!, selectedSite.latitude!])
        .setHTML(buildPopupHTML(selectedSite.site_name, selectedSite.corporation_name, selectedSite.division, selectedSite.facility_type_name ?? "", selectedSite.order_type ?? "", selectedSite.status, selectedSite.contract_amount))
        .addTo(map);
    }
  }, [sites, selectedSiteId]);

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
