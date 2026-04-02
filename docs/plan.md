# 건설현장 대시보드 - 프로젝트 계획서

> 최종 수정: 2026-04-01  
> 작성: 프로젝트 총괄 매니저 (AI)

---

## 1. 프로젝트 개요

### 목적
3개 건설사(남광토건, 극동건설, 금광기업)의 전체 현장을 **하나의 통합 대시보드**에서 실시간으로 파악할 수 있는 경영진용 현장 관리 시스템 구축

### 주요 사용자
- **회장님** (현장 순찰 시 태블릿/모바일로 확인)
- 본사 관리자 (인사/현장 데이터 관리)

### 핵심 원칙
- **한눈에 파악**: 요약 데이터 위주, 드릴다운으로 상세 확인
- **모바일 우선**: 현장 순찰 시 태블릿/모바일 최적화
- **실시간성**: Supabase Realtime 활용으로 최신 데이터 반영
- **고성능 검색**: 회사명·지역·현장 유형으로 즉시 필터링

---

## 2. 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| 프론트엔드 | Next.js 15 (App Router) | SSR/SSG, 빠른 초기 로딩, 모바일 최적화 |
| UI 프레임워크 | Tailwind CSS v4 + shadcn/ui | `design-system/` 부서 디자인 소스 활용 |
| 차트/시각화 | Recharts | React 친화적, 반응형 차트 |
| 백엔드/DB | Supabase (PostgreSQL) | 이미 구축됨, REST API + Realtime |
| 인증 | Supabase Auth | 기존 User 테이블 연동, 역할 기반 접근제어 |
| 배포 | 미정 | 추후 결정 (Vercel, AWS, 자체 서버 등 검토) |
| 언어 | TypeScript | 타입 안전성, 개발 생산성 |

### 디자인 시스템 참조 (필수)
- `design-system/globals.css` → `src/app/globals.css`로 복사
- `design-system/components/ui/*` → `src/components/ui/`로 복사
- 색상: CSS 변수 토큰 사용 (`bg-primary`, `text-muted-foreground` 등)
- 폰트: Noto Sans KR (기본), Geist Mono (숫자/금액)
- 둥글기: 카드 `rounded-2xl`, 버튼/인풋 `rounded-lg`, 뱃지 `rounded-full`
- 레이아웃 패턴: `design-system/components/layout/` 참고

---

## 3. 전사 현장 통합 대시보드 (핵심 MVP)

### 3.1 화면 구성

```
┌──────────────────────────────────────────────────────────┐
│  Header: 로고 + 사용자 메뉴                                │
├──────────────────────────────────────────────────────────┤
│  🔍 Global Search Bar                                    │
│  [회사명 ▼] [지역 ▼] [현장유형 ▼] [검색어 입력...]          │
├────────────────────────┬─────────────────────────────────┤
│  현장 리스트 (Master)    │  현장 상세 (Detail)               │
│                        │                                 │
│  ┌──────────────────┐  │  현장명: OO아파트 신축공사          │
│  │ OO아파트 신축공사  │  │  ──────────────────────          │
│  │ 공정률: 72%       │  │  ✅ 공기 준수 여부: 정상           │
│  │ 상태: 🟢 정상     │  │  👷 투입 인원: 45명               │
│  └──────────────────┘  │  ⚠️ 주요 이슈: 없음               │
│  ┌──────────────────┐  │  📸 최근 현장 사진:               │
│  │ XX교량 보수공사    │  │  [사진1] [사진2] [사진3]          │
│  │ 공정률: 45%       │  │                                 │
│  │ 상태: 🟡 주의     │  │  팀/인력 현황                     │
│  └──────────────────┘  │  ┌─────┬──────┬─────┐           │
│  ┌──────────────────┐  │  │ 팀명 │ 인원  │ 팀장 │           │
│  │ △△도로 확장공사   │  │  ├─────┼──────┼─────┤           │
│  │ 공정률: 12%       │  │  │건축팀│ 15명 │ 김OO│           │
│  │ 상태: 🔴 위험     │  │  │토목팀│ 12명 │ 박OO│           │
│  └──────────────────┘  │  └─────┴──────┴─────┘           │
│                        │                                 │
│  (카드 클릭 시 우측 갱신) │                                 │
├────────────────────────┴─────────────────────────────────┤
│  Mobile: 하단 네비게이션 바                                 │
└──────────────────────────────────────────────────────────┘
```

### 3.2 상단 검색 바 (Global Search)

| 항목 | 설명 |
|------|------|
| 법인 필터 | 드롭다운: 전체 / 남광토건 / 극동건설 / 금광기업 (corporation) |
| 부문 필터 | 드롭다운: 전체 / 토목 / 건축 (division) |
| 지역 필터 | 드롭다운: 전체 / 서울 / 경기 / 인천 / ... (region_code) |
| 시설물 유형 | 드롭다운: 전체 / 도로 / 철도 / 택지 / BTL / 민간 / ... (facility_type) |
| 텍스트 검색 | Input: 현장명 자유 검색 (debounce 300ms) |
| 상태 필터 | 선택 뱃지: ACTIVE / COMPLETED / SUSPENDED |
| 리스크 등급 | 선택 뱃지: A(red) / B(yellow) / C(blue) / D(green) |

**사용 컴포넌트**: `Select`, `Input`, `Badge` (design-system/components/ui/)

### 3.3 좌측 현장 리스트 (Master Panel)

각 현장을 **Card** 컴포넌트로 나열:

| 카드 요소 | 내용 | 컴포넌트 |
|-----------|------|----------|
| 현장명 | v_site_dashboard.site_name | CardTitle |
| 법인 뱃지 | corporation_name (남광토건/극동건설/금광기업) | Badge (variant: brand/success/orange) |
| 시설물 유형 | facility_type_name (도로/철도/BTL 등) | Badge (variant: gray) |
| 공정률 | progress_rate (소수→%) + 프로그레스바 | 커스텀 ProgressBar |
| 리스크 등급 | risk_grade (A/B/C/D) | Badge (variant: error/warning/info/success) |
| 도급액 | contract_amount (억원) | 텍스트 |
| 투입 인원 | headcount | 텍스트 |

- 선택된 카드: `ring-2 ring-primary` 하이라이트
- 정렬: 상태 위험순 → 공정률 낮은순 (기본값)
- 모바일: 전체 화면 카드 리스트, 카드 탭 시 상세 페이지로 전환

### 3.4 우측 현장 상세 (Detail Panel)

현장 카드 선택 시 표시되는 상세 정보:

| 섹션 | 내용 |
|------|------|
| **기본 정보** | 현장명, 법인, 부문, 발주처, 시설물유형, 지역, 현장사무소 주소 |
| **공사 현황** | 착공일~준공예정일, 도급액, 자사분, 실행률, 실행상태 |
| **공정 현황** | 공정률 + 프로그레스바, 리스크등급, 지연일수, 공정비고 |
| **현장 인력** | 현장소장(직급/연락처), PM(직급), 투입인원 headcount |
| **JV 참여 현황** | jv_summary + 상세 (업체명, 지분율, 주관사 여부) |
| **공정 이력** | progress_snapshot 차트 (실행률/공정률 추이) |
| **메모** | latest_memo (향후 site_memo 테이블 연동) |

**사용 컴포넌트**: `Card`, `Table`, `Badge`, `Dialog`, `Separator`

### 3.5 반응형 레이아웃

| 뷰포트 | 레이아웃 |
|---------|----------|
| **Desktop** (≥1024px) | 좌측 리스트(w-1/3) + 우측 상세(w-2/3), 사이드바 고정 |
| **Tablet** (768~1023px) | 상단 리스트 + 하단 상세, 사이드바 오버레이 |
| **Mobile** (<768px) | 리스트 전체화면 ↔ 상세 전체화면 토글, 하단 네비게이션 |

---

## 4. 에이전트별 임무

### 🎨 ui-agent 임무

`design-system/` 디자인 소스를 기반으로 UI 구현:

| # | 작업 | 산출물 |
|---|------|--------|
| U1 | 프로젝트 초기화 + 디자인 시스템 적용 | Next.js 셋업, globals.css, ui 컴포넌트 복사 |
| U2 | AppLayout 구현 | `src/components/layout/` (Header, Sidebar, MobileNav) |
| U3 | Global Search Bar | `src/components/dashboard/search-bar.tsx` |
| U4 | 현장 카드 컴포넌트 | `src/components/dashboard/site-card.tsx` |
| U5 | Master-Detail 레이아웃 | `src/app/dashboard/page.tsx` |
| U6 | 현장 상세 패널 | `src/components/dashboard/site-detail.tsx` |
| U7 | 사진 갤러리 (Dialog) | `src/components/dashboard/photo-gallery.tsx` |
| U8 | 반응형 대응 | 모바일/태블릿 레이아웃 분기 |

**디자인 규칙**:
- `design-system/components/layout/` 패턴 참고 (AppLayout, Header, Sidebar)
- 회사별 색상: 남광토건 `brand(blue)`, 극동건설 `success(green)`, 금광기업 `orange`
- 상태 뱃지: 정상 `success`, 주의 `warning`, 위험 `error`
- 카드: `rounded-2xl`, `shadow-sm hover:shadow-md`
- 테이블: `design-system/components/ui/table.tsx` 그대로 사용

### 🗄️ db-agent 임무

Site 테이블 설계 + 검색 필터링 쿼리 로직:

| # | 작업 | 산출물 |
|---|------|--------|
| D1 | Site 테이블 설계 | DDL + Supabase 마이그레이션 |
| D2 | 시드 데이터 작성 | 3개사 × 다수 현장 샘플 데이터 |
| D3 | 검색 필터링 쿼리 | 회사/지역/유형/텍스트 복합 필터 |
| D4 | 현장 상세 조회 쿼리 | Site + Team + Employee JOIN |
| D5 | Supabase JS Client 코드 | `src/lib/queries/sites.ts` |

---

## 5. DB 스키마 (pmis 스키마)

> **중요**: Supabase의 `pmis` 스키마를 사용한다. `public` 스키마는 사용하지 않음.

### 핵심 테이블 (데이터 있음)

| 테이블 | 레코드 수 | 설명 |
|--------|-----------|------|
| `corporation` | 3 | 법인 (남광토건/극동건설/금광기업) |
| `project_site` | 216 | 현장 정보 (핵심 테이블) |
| `region_code` | 17 | 지역 코드 (수도권/강원권/충청권/호남권/영남권/해외) |
| `facility_type` | 15 | 시설물 유형 (토목 10종 + 건축 5종) |
| `client_org` | 34 | 발주처 (PUBLIC/BTL/PRIVATE) |
| `partner_company` | 117 | JV 참여업체 (그룹사 3 + 외부 114) |
| `jv_participation` | 510 | JV 참여 현황 (지분율, 주관사 여부) |
| `progress_snapshot` | 156 | 공정률/실행률 이력 스냅샷 |
| **`v_site_dashboard`** | (뷰) | **대시보드용 통합 뷰** (JOIN 완료, 메인 쿼리에 사용) |

### 미사용 테이블 (구조만 존재, 0건)

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `site_milestone` | 마일스톤 | Phase 2 |
| `site_memo` | 현장 메모 | Phase 2 |
| `site_spec` | 현장 사양 | Phase 2 |
| `site_personnel` | 인력 배치 | Phase 2 |
| `site_visit` | 방문 기록 | Phase 2 |
| `site_media` | 사진/미디어 | Phase 2 |

### 테이블 관계도

```
corporation (법인: 남광토건/극동건설/금광기업)
  └── project_site (현장 216개)
        ├── region_code (지역)
        ├── facility_type (시설물 유형)
        ├── client_org (발주처)
        ├── jv_participation → partner_company (JV 참여)
        └── progress_snapshot (공정 이력)

v_site_dashboard = project_site JOIN 위 테이블들 (대시보드 메인 뷰)
```

### 검색 필터링 쿼리 (v_site_dashboard 뷰 사용)

```typescript
// src/lib/supabase.ts - pmis 스키마 지정 필수
const supabase = createClient(url, key, { db: { schema: 'pmis' } })

// src/lib/queries/sites.ts
interface SiteFilter {
  corporation?: string;   // 법인명 필터
  region?: string;        // 지역명 필터
  facilityType?: string;  // 시설물 유형 필터
  division?: string;      // 부문 필터 (토목/건축)
  status?: string;        // 상태 필터 (ACTIVE/COMPLETED/SUSPENDED)
  riskGrade?: string;     // 리스크 등급 (A/B/C/D)
  search?: string;        // 텍스트 검색 (현장명)
}

async function getSites(filter: SiteFilter) {
  let query = supabase
    .from('v_site_dashboard')
    .select('*')

  if (filter.corporation)  query = query.eq('corporation_name', filter.corporation)
  if (filter.region)       query = query.eq('region_name', filter.region)
  if (filter.facilityType) query = query.eq('facility_type_name', filter.facilityType)
  if (filter.division)     query = query.eq('division', filter.division)
  if (filter.status)       query = query.eq('status', filter.status)
  if (filter.riskGrade)    query = query.eq('risk_grade', filter.riskGrade)
  if (filter.search)       query = query.ilike('site_name', `%${filter.search}%`)

  return query.order('risk_grade', { ascending: true })
              .order('progress_rate', { ascending: true })
}
```

### 주요 데이터 참고

- **도급액 단위**: 억원 (contract_amount)
- **실행률/공정률**: 소수 표현 (0.97 = 97%)
- **리스크 등급**: A(최고위험) → B → C → D(안전)
- **상태**: ACTIVE(진행중), COMPLETED(준공), SUSPENDED(중지)
- **JV 요약**: v_site_dashboard의 jv_summary 컬럼에 자동 생성 (예: "남광토건 51%, 장원 49%")

---

## 6. 프로젝트 디렉토리 구조

```
SiteInformation/
├── docs/
│   └── plan.md                        ← 현재 문서
├── design-system/                     ← 부서 디자인 소스 (참조용)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # AppLayout (Header + Sidebar + MobileNav)
│   │   ├── page.tsx                   # → /dashboard 리다이렉트
│   │   ├── globals.css                # design-system/globals.css 복사
│   │   ├── dashboard/
│   │   │   └── page.tsx               # 전사 현장 통합 대시보드 (Master-Detail)
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         # 로그인
│   │   └── site/[id]/
│   │       └── page.tsx               # 현장 단독 상세 페이지 (모바일용)
│   ├── components/
│   │   ├── ui/                        # design-system/components/ui/ 복사
│   │   ├── layout/                    # AppLayout, Header, Sidebar, MobileNav
│   │   └── dashboard/
│   │       ├── search-bar.tsx         # Global Search Bar
│   │       ├── site-card.tsx          # 현장 카드
│   │       ├── site-list.tsx          # 현장 리스트 (Master)
│   │       ├── site-detail.tsx        # 현장 상세 (Detail)
│   │       └── photo-gallery.tsx      # 사진 갤러리
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 클라이언트
│   │   ├── utils.ts                   # cn() 등 유틸
│   │   └── queries/
│   │       └── sites.ts              # 현장 조회/검색 쿼리
│   └── types/
│       └── database.ts               # Site, Location, Team, Employee 타입
├── public/
├── .env.local                         # Supabase 키 (NEXT_PUBLIC_*)
└── .claude/agents/
    ├── db-expert.md
    └── ui-agent.md
```

---

## 7. 개발 마일스톤

```
Sprint 1: 기반 구축 [P0]
├── db-agent: Site 테이블 생성 + 시드 데이터 (D1, D2)
├── ui-agent: Next.js 초기화 + 디자인 시스템 적용 (U1)
└── ui-agent: AppLayout (Header, Sidebar, MobileNav) (U2)

Sprint 2: 통합 대시보드 MVP [P0]
├── db-agent: 검색 필터링 쿼리 + JS Client 코드 (D3, D5)
├── ui-agent: Global Search Bar (U3)
├── ui-agent: 현장 카드 + Master-Detail 레이아웃 (U4, U5)
└── ui-agent: 현장 상세 패널 (U6)

Sprint 3: 완성도 향상 [P1]
├── db-agent: 현장 상세 조회 쿼리 (D4)
├── ui-agent: 사진 갤러리 + Dialog (U7)
├── ui-agent: 반응형 대응 + 모바일 최적화 (U8)
└── 인증/로그인 연동
```

---

## 8. 우선순위 정의

| 등급 | 의미 | 타이밍 |
|------|------|--------|
| **P0** | 필수 - MVP에 반드시 포함 | Sprint 1~2 |
| **P1** | 중요 - 핵심 사용성 확보 | Sprint 3 |
| **P2** | 보통 - 운영 효율화 | Phase 2 |
| **P3** | 낮음 - 향후 개선 | Phase 3 이후 |
