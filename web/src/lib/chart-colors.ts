/**
 * 차트/지도/범례 색상 단일 출처 (single source of truth)
 *
 * ─────────────────────────────────────────────────────────────────────
 *  구조 — 2 레이어
 * ─────────────────────────────────────────────────────────────────────
 *  Layer 1: semantic — 의미 단위 시맨틱 토큰. 여러 차트가 공유.
 *           이 값을 바꾸면 참조하는 모든 차트가 동시에 바뀐다.
 *
 *  Layer 2: charts.<chartName> — 차트별 슬롯.
 *           기본값은 semantic 토큰을 가리키지만, 특정 차트만 색을 다르게
 *           주고 싶으면 그 슬롯의 값만 직접 hex로 덮어쓰면 된다.
 *           → 그 차트만 영향 받음.
 *
 *  범례(legend)는 절대 hex를 직접 쓰지 말고, 항상 같은 차트 슬롯을
 *  import 해서 그 슬롯에서 색을 가져올 것. 그래야 차트와 범례가
 *  구조적으로 동기화된다.
 * ─────────────────────────────────────────────────────────────────────
 */

/* ── Layer 1: semantic tokens ─────────────────────────── */

export const semantic = {
  status: {
    active:    "#3B82F6",  // 진행중
    preStart:  "#14B8A6",  // 착공전
    completed: "#BFDBFE",  // 준공
    suspended: "#EF4444",  // 중단
  },
  division: {
    arch:  "#2563EB",      // 건축
    civil: "#BFDBFE",      // 토목
  },
  corporation: {
    namgwang: "#16A34A",   // 남광토건
    geukdong: "#2563EB",   // 극동건설
    geumgwang: "#EA580C",  // 금광기업
  },
  amountScale: [
    "#BFDBFE",
    "#93C5FD",
    "#60A5FA",
    "#3B82F6",
    "#1D4ED8",
  ],
  region: {
    // Map base — modern "cool slate" palette tuned to whisper, not shout.
    // Slight blue undertone reads as Linear/Vercel/Notion-style tech UI.
    // Each step is intentionally close to the next (~10% step) so the
    // 4-tone shading creates rhythm without distracting from the bubbles.
    //
    // Calibrated against pure white card bg + the metric bubble palettes
    // so any of count/headcount/contract bubbles pop with strong contrast.
    fillLight: "#F1F4F9", // near-white, cool slate-50/100 territory
    fillMid:   "#E2E7F0", // light cool slate
    fillDark:  "#CBD3E0", // medium cool slate
    fillExtra: "#A9B3C5", // accent cool slate (used sparingly)
    bubble:      "#BFDBFE",
    bubbleHover: "#93C5FD",
  },
  text: {
    onDark:  "#FFFFFF",  // 진한 배경 위
    onLight: "#1E3A8A",  // 연한 배경(연한 블루 등) 위 — 다크 네이비
  },
  neutral: {
    fallback: "#6B7280", // 미분류 / 기본값
  },
} as const;

/* ── Layer 2: per-chart slots ─────────────────────────── */
/* 각 차트가 실제로 사용하는 색. 기본은 semantic 참조.        */
/* 특정 차트만 다른 색을 쓰려면 아래 객체에서 그 키만 직접     */
/* 값(hex)을 바꾸면 됨 — 그 차트에만 적용된다.                */

export const charts = {
  /* 통계 페이지 — 상태 도넛 */
  statusDonut: {
    active:    semantic.status.active,
    preStart:  semantic.status.preStart,
    completed: semantic.status.completed,
    /* 슬라이스 위에 표시되는 숫자 라벨 색 */
    labelOnDark:  semantic.text.onDark,
    labelOnLight: semantic.text.onLight,
  },

  /* 통계 페이지 — 상태 파이(레전드용 status-chart.tsx) */
  statusPie: {
    active:    semantic.status.active,
    preStart:  semantic.status.preStart,
    completed: semantic.status.completed,
    suspended: semantic.status.suspended,
  },

  /* 통계 페이지 — 연도별 가로 막대 (착공/준공) */
  completionYear: {
    preStart: semantic.status.preStart,
    active:   semantic.status.active,
  },

  /* 통계 페이지 — breakdown-tabs 내부 막대들 */
  breakdownStatus: {
    active:    semantic.status.active,
    preStart:  semantic.status.preStart,
    completed: semantic.status.completed,
    suspended: semantic.status.suspended,
  },
  breakdownDivision: {
    arch:  semantic.division.arch,
    civil: semantic.division.civil,
  },
  breakdownAmount: semantic.amountScale,
  /* breakdown-tabs 법인별 — 현재는 의도적으로 3개 모두 같은 블루.       */
  /* 법인별로 색을 구분하고 싶으면 여기서 각각 다른 값 지정.              */
  breakdownCorp: {
    namgwang:  semantic.status.active,
    geukdong:  semantic.status.active,
    geumgwang: semantic.status.active,
    fallback:  semantic.status.active,
  },

  /* 통계 페이지 — 법인×공종 차트 */
  corpDivision: {
    arch:    semantic.division.arch,
    civil:   semantic.division.civil,
    onLight: semantic.text.onLight,
  },

  /* 통계 페이지 — 금액 히트맵 */
  amountHeatmap: {
    arch:    semantic.division.arch,
    civil:   semantic.division.civil,
    onLight: semantic.text.onLight,
  },

  /* 통계 페이지 — 한국 지도 */
  koreaMap: {
    /** 지도 베이스(시·도 영역)의 회색조 채움. metric과 무관. */
    fill: {
      light: semantic.region.fillLight,
      mid:   semantic.region.fillMid,
      dark:  semantic.region.fillDark,
      extra: semantic.region.fillExtra,
    },

    /** Metric별 버블 테마. 사용자가 우측 상단 토글로 metric을 바꾸면
     *  버블 그래디언트(`bubble`/`bubbleHover`), 호버·선택 링(`ring`),
     *  드롭 섀도우(`shadow`)가 동시에 이 팔레트로 전환된다.
     *
     *  - count(파랑): 기존 톤 유지 — 회귀 위험 0
     *  - headcount(시안): 사람·활력 의미
     *  - contract(앰버): 금액·자산 의미
     *  세 톤 모두 Tailwind 100~700 라인의 검증된 색을 사용. */
    metric: {
      count: {
        bubble:      "#BFDBFE",
        bubbleHover: "#93C5FD",
        ring:        "#2563EB",
        shadow:      "#1E3A8A",
      },
      headcount: {
        bubble:      "#BAE6FD",
        bubbleHover: "#7DD3FC",
        ring:        "#0284C7",
        shadow:      "#075985",
      },
      contract: {
        bubble:      "#C7D2FE",
        bubbleHover: "#A5B4FC",
        ring:        "#4F46E5",
        shadow:      "#3730A3",
      },
    },

    /** Deprecated — Phase before metric-themed bubbles. Kept until all
     *  callers migrate; unused by korea-map-chart after the metric refactor. */
    bubble:      semantic.region.bubble,
    bubbleHover: semantic.region.bubbleHover,
  },

  /* 대시보드/통계 — 지도 마커 (상태/공종/법인 카테고리)
   *
   * ⚠️ 구조 중요 — 범례와 마커는 같은 배열을 공유한다.
   *    각 카테고리는 `{ key, label, color }` 엔트리의 배열이다.
   *    - 범례:  이 배열을 순회해 swatch+label 렌더
   *    - 마커:  이 배열을 key 기준 lookup으로 색 매핑
   *    한 엔트리의 color를 바꾸면 범례와 마커가 동시에 바뀐다.
   *    엔트리 자체를 추가/삭제해도 범례와 마커가 동시에 반영된다.
   */
  siteMap: {
    /* siteMap 상태 — 공종(건축 블루/토목 연블루)과 팔레트가 겹치지 않게
       지도 전용으로 emerald / amber / slate 트리어드 사용. */
    status: [
      { key: "ACTIVE",    label: "진행중", color: "#10B981" }, // emerald-500
      { key: "PRE_START", label: "착공전", color: "#F59E0B" }, // amber-500
      { key: "COMPLETED", label: "준공",   color: "#94A3B8" }, // slate-400
    ] as readonly { key: string; label: string; color: string }[],
    division: [
      { key: "건축", label: "건축", color: semantic.division.arch },
      { key: "토목", label: "토목", color: semantic.division.civil },
    ] as readonly { key: string; label: string; color: string }[],
    corporation: [
      { key: "남광토건",  label: "남광토건",  color: semantic.corporation.namgwang },
      { key: "극동건설",  label: "극동건설",  color: semantic.corporation.geukdong },
      { key: "금광기업",  label: "금광기업",  color: semantic.corporation.geumgwang },
    ] as readonly { key: string; label: string; color: string }[],
    fallback: semantic.neutral.fallback,
  },

  /* 통계 페이지 — 법인별 성과 비교 (corporation-chart.tsx) */
  corporationBars: {
    sites:    semantic.status.active,    // 현장수 막대
    headcount: "#06B6D4",                // 인원 막대 (cyan)
    namgwang:  semantic.status.active,
    geukdong:  semantic.status.active,
    geumgwang: semantic.status.active,
    fallback:  "#666666",
  },

  /* 통계 페이지 — 도급액 규모별 분포 (amount-distribution-chart.tsx) */
  amountDistribution: [
    "#94A3B8",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
  ] as readonly string[],

  /* 대시보드 — JV 도넛 (법인 + 보조 슬라이스) */
  jvChart: {
    corporation: {
      namgwang:  semantic.corporation.namgwang,
      geukdong:  semantic.corporation.geukdong,
      geumgwang: semantic.corporation.geumgwang,
    },
    /* 위 3개 외 추가 법인용 보조 팔레트 */
    extra: [
      "#94A3B8",
      "#CBD5E1",
      "#A5B4FC",
      "#D4D4D8",
      "#BFDBFE",
      "#C4B5FD",
      "#FDE68A",
      "#D1D5DB",
    ],
  },
} as const;
