import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton placeholder for KoreaMapChart while `/korea-provinces.json`
 *  topojson loads (typically 200–500ms). Mirrors the loaded chart's outer
 *  structure (`p-2 relative` inside breakdown-tabs' `glass-card-dark`
 *  wrapper) so swap-in causes zero layout shift.
 *
 *  Silhouette strategy: a simplified Korean peninsula path (~10 anchor
 *  points) + 4 size-varied bubble placeholders at canonical region
 *  positions (수도권/강원/호남/영남) + the "해외" dashed box overlay.
 *  Keeps the same SVG viewBox (700×1210) and aspect ratio as the real map. */
export function KoreaMapSkeleton() {
  const W = 700;
  const H = 1210;

  return (
    <div className="p-2 relative pointer-events-none">
      {/* Top-left: "상세 지도 보기" button placeholder */}
      <div className="absolute top-3 left-3 z-20">
        <Skeleton className="w-28 h-6 rounded-full" />
      </div>

      {/* Top-right: 3-pill metric toggle placeholder */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 items-end">
        <Skeleton className="w-16 h-6 rounded-full" />
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-24 h-6 rounded-full" />
      </div>

      {/* Map area — same aspect-ratio + maxHeight as the loaded chart */}
      <div
        className="relative"
        style={{ marginTop: 20, width: "100%", aspectRatio: `${W} / ${H}`, maxHeight: 430 }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          aria-hidden
        >
          {/* Simplified Korean peninsula silhouette — ~12 anchor points.
              Recognizable as Korea without trying to match province detail. */}
          <path
            d="
              M 360 90
              C 320 80, 280 110, 270 160
              L 240 220
              C 220 260, 200 300, 220 350
              L 240 400
              C 230 440, 200 450, 200 490
              L 220 540
              C 240 580, 240 620, 230 660
              L 220 720
              C 200 760, 190 810, 220 850
              L 270 900
              C 300 940, 320 980, 330 1020
              L 360 1070
              C 400 1095, 440 1090, 470 1060
              L 500 1010
              C 520 970, 530 920, 510 870
              L 480 820
              C 470 770, 480 720, 500 670
              L 510 600
              C 510 540, 490 490, 470 450
              L 460 400
              C 480 350, 510 320, 510 270
              L 490 200
              C 470 150, 430 110, 380 95
              Z
            "
            className="fill-muted animate-pulse"
          />

          {/* 4 region-bubble placeholders (수도권 / 강원 / 호남 / 영남) */}
          <circle cx="320" cy="280" r="55" className="fill-muted/70 animate-pulse" />
          <circle cx="450" cy="350" r="38" className="fill-muted/70 animate-pulse" />
          <circle cx="280" cy="700" r="42" className="fill-muted/70 animate-pulse" />
          <circle cx="430" cy="780" r="48" className="fill-muted/70 animate-pulse" />

          {/* 제주 dot — far south, smaller */}
          <circle cx="320" cy="1140" r="22" className="fill-muted/70 animate-pulse" />
        </svg>

        {/* "해외" dashed overlay box placeholder — bottom-right quadrant */}
        <div className="absolute bottom-2 right-2">
          <div className="w-[230px] h-[175px] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <Skeleton className="w-20 h-3 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
