# AICON 디자인 시스템

AICON 콘크리트 품질시험 자동화 시스템의 UI 디자인 시스템 문서입니다.
shadcn/ui (Radix UI) 기반, Tailwind CSS v4, Figma Untitled UI 스타일을 따릅니다.

---

## 목차

1. [색상 (Colors)](#색상-colors)
2. [타이포그래피 (Typography)](#타이포그래피-typography)
3. [간격 (Spacing)](#간격-spacing)
4. [그림자 (Shadows)](#그림자-shadows)
5. [둥글기 (Border Radius)](#둥글기-border-radius)
6. [컴포넌트 (Components)](#컴포넌트-components)

---

## 색상 (Colors)

### 시맨틱 토큰

라이트/다크 모드에 따라 자동 전환되는 CSS 변수 기반 시맨틱 토큰입니다.

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--background` | `#F8FAFC` (Slate-50) | `#020617` (Slate-950) | 페이지 배경 |
| `--foreground` | `#0F172A` (Slate-900) | `#F8FAFC` (Slate-50) | 기본 텍스트 |
| `--primary` | `#2563EB` (Blue-600) | `#3B82F6` (Blue-500) | 브랜드/주요 액션 |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Primary 위 텍스트 |
| `--primary-light` | `#BFDBFE` (Blue-200) | `#1E40AF` (Blue-800) | Primary 연한 배경 |
| `--secondary` | `#F1F5F9` (Slate-100) | `#1E293B` (Slate-800) | 보조 배경 |
| `--muted` | `#F1F5F9` (Slate-100) | `#1E293B` (Slate-800) | 비활성/음소거 배경 |
| `--muted-foreground` | `#64748B` (Slate-500) | `#94A3B8` (Slate-400) | 보조 텍스트 |
| `--accent` | `#EFF6FF` (Blue-50) | `#1E293B` (Slate-800) | 강조 배경 |
| `--destructive` | `#DC2626` (Red-600) | `#EF4444` (Red-500) | 삭제/위험 |
| `--success` | `#16A34A` (Green-600) | `#22C55E` (Green-500) | 성공 |
| `--warning` | `#EAB308` (Yellow-500) | `#EAB308` (Yellow-500) | 경고 |
| `--border` | `#E2E8F0` (Slate-200) | `#334155` (Slate-700) | 테두리 |
| `--input` | `#CBD5E1` (Slate-300) | `#334155` (Slate-700) | 입력 필드 테두리 |
| `--ring` | `#2563EB` (Blue-600) | `#3B82F6` (Blue-500) | 포커스 링 |
| `--card` | `#FFFFFF` | `#0F172A` (Slate-900) | 카드 배경 |
| `--popover` | `#FFFFFF` | `#0F172A` (Slate-900) | 팝오버 배경 |

### 상태 Badge/알림용 색상 토큰

Badge, 알림 등에서 사용하는 연한 배경/텍스트/테두리 토큰입니다.

| 토큰 그룹 | Light 배경 | Light 텍스트 | Light 테두리 | 용도 |
|-----------|-----------|-------------|-------------|------|
| `--info-*` | Blue-50 | Blue-700 | Blue-200 | 정보/브랜드 상태 |
| `--destructive-muted-*` | Red-50 | Red-700 | Red-200 | 에러/삭제 상태 |
| `--success-muted-*` | Green-50 | Green-700 | Green-200 | 성공 상태 |
| `--warning-muted-*` | Yellow-50 | Yellow-700 | Yellow-300 | 경고 상태 |
| `--orange-muted-*` | Orange-50 | Orange-700 | Orange-200 | 주황 상태 |

> 다크 모드에서는 각각 대응하는 어두운 톤(950/300 계열)으로 자동 전환됩니다.

### 컬러 팔레트

Tailwind CSS v4 기본 팔레트를 그대로 사용합니다 (별도 재선언 없음).
주로 사용하는 팔레트와 용도:

| 팔레트 | 용도 |
|--------|------|
| **Blue** | 브랜드, Primary, 링크 |
| **Sky** | 보조 강조, 차트 |
| **Red** | Error, Destructive |
| **Orange** | 보조 경고 |
| **Amber** | 경고 강조, 송장 상태 |
| **Yellow** | Warning |
| **Green** | Success |
| **Purple** | 특수 상태 (일괄분석 등) |
| **Slate** | 회색(블루 틴트), 배경/테두리 |
| **Neutral** | 순수 회색, 텍스트/아이콘/UI 컴포넌트 |

### 차트 색상

| 변수 | 색상 | 용도 |
|------|------|------|
| `--chart-1` | Blue-600 | 주요 데이터 |
| `--chart-2` | Sky-500 | 보조 데이터 |
| `--chart-3` | Yellow-500 | 세 번째 데이터 |
| `--chart-4` | Green-500 | 네 번째 데이터 |
| `--chart-5` | Blue-300 | 다섯 번째 데이터 |

### Sidebar 토큰

사이드바 전용 시멘틱 토큰입니다. 다크 모드에서 자동 전환됩니다.

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--sidebar` | `#FFFFFF` | `#1E293B` (Slate-800) | 사이드바 배경 |
| `--sidebar-foreground` | `#475569` (Slate-600) | `#94A3B8` (Slate-400) | 사이드바 텍스트 |
| `--sidebar-primary` | `#2563EB` (Blue-600) | `#60A5FA` (Blue-400) | 활성 메뉴 |
| `--sidebar-primary-foreground` | `#FFFFFF` | `#FFFFFF` | 활성 메뉴 텍스트 |
| `--sidebar-accent` | `#F1F5F9` (Slate-100) | `rgba(255,255,255,0.08)` | 호버 배경 |
| `--sidebar-accent-foreground` | `#0F172A` (Slate-900) | `#F1F5F9` (Slate-100) | 호버 텍스트 |
| `--sidebar-border` | `#E2E8F0` (Slate-200) | `rgba(255,255,255,0.1)` | 사이드바 구분선 |

### 그라디언트

```css
/* Brand (Blue) — 6종 */
--gradient-brand-light:    linear-gradient(90deg, #2563EB, #3B82F6);
--gradient-brand-medium:   linear-gradient(45deg, #1D4ED8, #2563EB);
--gradient-brand-dark:     linear-gradient(45deg, #1E40AF, #2563EB);
--gradient-brand-dark-v:   linear-gradient(90deg, #1E40AF, #2563EB);
--gradient-brand-deep:     linear-gradient(26.5deg, #1E40AF, #1D4ED8);
--gradient-brand-deepest:  linear-gradient(45deg, #1E3A8A, #2563EB);

/* Neutral — 6종 */
--gradient-neutral-light:    linear-gradient(90deg, #525252, #737373);
--gradient-neutral-medium:   linear-gradient(45deg, #404040, #525252);
--gradient-neutral-dark:     linear-gradient(45deg, #262626, #525252);
--gradient-neutral-dark-v:   linear-gradient(90deg, #262626, #525252);
--gradient-neutral-deep:     linear-gradient(26.5deg, #262626, #404040);
--gradient-neutral-deepest:  linear-gradient(45deg, #171717, #525252);
```

---

## 타이포그래피 (Typography)

| 폰트 | 클래스 | 용도 |
|------|--------|------|
| `Noto Sans KR` | `font-sans` (기본) | 모든 UI 텍스트 |
| `Geist Mono` | `font-mono` | 숫자, 시간, 금액 등 고정폭 정렬이 필요한 곳 |

### Display 스케일

| 토큰 | 크기 | 행간 | 자간 |
|------|------|------|------|
| `display-2xl` | 4.5rem (72px) | 5.625rem | -0.02em |
| `display-xl` | 3.75rem (60px) | 4.5rem | -0.02em |
| `display-lg` | 3rem (48px) | 3.75rem | -0.02em |
| `display-md` | 2.25rem (36px) | 2.75rem | -0.02em |
| `display-sm` | 1.875rem (30px) | 2.375rem | — |
| `display-xs` | 1.5rem (24px) | 2rem | — |

### Text 스케일

| 토큰 | 크기 | 행간 | 사용 예시 |
|------|------|------|----------|
| `text-xl` | 1.25rem (20px) | 1.875rem | 섹션 제목 |
| `text-lg` | 1.125rem (18px) | 1.75rem | Dialog 타이틀 |
| `text-md` | 1rem (16px) | 1.5rem | 본문 |
| `text-sm` | 0.875rem (14px) | 1.25rem | 레이블, 테이블 셀 |
| `text-xs` | 0.75rem (12px) | 1.125rem | Badge, 보조 텍스트 |

### 사용 예시

```tsx
<h1 className="text-display-md font-semibold">페이지 제목</h1>
<p className="text-md text-muted-foreground">본문 설명</p>
<span className="text-xs text-muted-foreground">보조 텍스트</span>
```

---

## 간격 (Spacing)

Tailwind 기본 4px 단위 시스템을 따릅니다.

| 토큰 | 값 | 사용 예시 |
|------|----|----------|
| `0.5` | 2px | 아이콘 내부 gap |
| `1` | 4px | 최소 간격 |
| `1.5` | 6px | 인라인 요소 gap |
| `2` | 8px | 컴포넌트 내부 패딩 |
| `3` | 12px | 입력 필드 패딩 |
| `4` | 16px | 카드 내부 간격 |
| `5` | 20px | 카드 gap |
| `6` | 24px | 카드 수평 패딩 |
| `8` | 32px | 섹션 간격 |
| `10` | 40px | 큰 섹션 간격 |
| `16` | 64px | 페이지 수준 간격 |

---

## 그림자 (Shadows)

Figma Untitled UI 기반 7단계 그림자입니다.

| 토큰 | 사용 예시 |
|------|----------|
| `shadow-xs` | 입력 필드, 버튼 |
| `shadow-sm` | 카드 기본 |
| `shadow-md` | 호버 카드 |
| `shadow-lg` | 드롭다운, 팝오버 |
| `shadow-xl` | 모달 |
| `shadow-2xl` | 큰 모달 |
| `shadow-3xl` | 풀스크린 오버레이 |

---

## 둥글기 (Border Radius)

기본값: `--radius: 0.875rem` (14px)

| 토큰 | 값 | 사용 예시 |
|------|----|----------|
| `rounded-sm` | 10px | Checkbox |
| `rounded-md` | 12px | 드롭다운 아이템 |
| `rounded-lg` | 14px | 버튼, Input, Select |
| `rounded-xl` | 18px | — |
| `rounded-2xl` | 22px | 카드 |
| `rounded-full` | 9999px | Badge, Avatar |

---

## 컴포넌트 (Components)

### Button

`@/components/ui/button`

#### Variants

| variant | 설명 | 스타일 |
|---------|------|--------|
| `default` | 주요 액션 | `bg-primary text-primary-foreground` |
| `secondary` | 보조 액션 | `bg-accent text-primary` |
| `outline` | 테두리 버튼 | `bg-card border-border text-foreground` |
| `ghost` | 투명 버튼 | `text-muted-foreground`, 호버 시 `bg-muted` |
| `link` | 링크 스타일 | `text-primary`, 호버 시 밑줄 |
| `destructive` | 삭제/위험 | `bg-destructive text-destructive-foreground` |

#### Sizes

| size | 높이 | 패딩 | 폰트 | 둥글기 |
|------|------|------|------|--------|
| `xs` | 28px (h-7) | px-2.5 | text-xs | `rounded-md` |
| `sm` | 36px (h-9) | px-3.5 | text-sm | `rounded-lg` |
| `default` | 40px (h-10) | px-4 | text-sm | `rounded-lg` |
| `lg` | 44px (h-11) | px-4.5 | text-base | `rounded-lg` |
| `xl` | 48px (h-12) | px-5 | text-base | `rounded-lg` |
| `icon` | 40x40px | — | — | `rounded-lg` |
| `icon-xs` | 28x28px | — | — | `rounded-md` |
| `icon-sm` | 36x36px | — | — | `rounded-lg` |
| `icon-lg` | 44x44px | — | — | `rounded-lg` |

```tsx
<Button variant="default" size="default">저장</Button>
<Button variant="outline" size="sm">취소</Button>
<Button variant="destructive" size="sm">삭제</Button>
<Button variant="ghost" size="icon"><PlusIcon /></Button>
```

---

### Input

`@/components/ui/input`

#### Sizes

| size | 높이 |
|------|------|
| `default` | 44px (h-11) |
| `sm` | 36px (h-9) |

#### 스타일 특성
- 테두리: `input`, 포커스 시 `primary-light` + `ring-ring/15`
- 에러: `destructive` 테두리 + `ring-destructive/15`
- 비활성: `muted` 배경, `muted-foreground` 텍스트

```tsx
<Input placeholder="이름" />
<Input size="sm" placeholder="검색" />
```

---

### PasswordInput

`@/components/ui/password-input`

Input과 동일한 스타일에 비밀번호 표시/숨기기 토글 버튼이 포함됩니다.

| size | 높이 |
|------|------|
| `default` | 44px (h-11) |
| `sm` | 36px (h-9) |

```tsx
<PasswordInput placeholder="비밀번호" />
```

---

### Select

`@/components/ui/select`

#### SelectTrigger Sizes

| size | 높이 |
|------|------|
| `default` | 44px (h-11) |
| `sm` | 36px (h-9) |

#### 특수 Props
- `hasOptions`: `false`일 때 자동으로 `disabled` 처리

```tsx
<Select>
  <SelectTrigger size="sm">
    <SelectValue placeholder="선택" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">옵션 A</SelectItem>
    <SelectItem value="b">옵션 B</SelectItem>
  </SelectContent>
</Select>
```

---

### Badge

`@/components/ui/badge`

#### Variants

| variant | 스타일 | CSS 토큰 |
|---------|--------|----------|
| `brand` / `default` / `blue` | 파란 배경, 파란 텍스트 | `info-muted` / `info-muted-foreground` |
| `gray` / `secondary` | 회색 배경, 회색 텍스트 | `muted` / `muted-foreground` |
| `error` / `destructive` | 빨간 배경, 빨간 텍스트 | `destructive-muted` / `destructive-muted-foreground` |
| `warning` | 노란 배경, 노란 텍스트 | `warning-muted` / `warning-muted-foreground` |
| `success` | 초록 배경, 초록 텍스트 | `success-muted` / `success-muted-foreground` |
| `sky` | 하늘 배경, 하늘 텍스트 | `info-muted` / `info-muted-foreground` |
| `slate` | 슬레이트 배경, 슬레이트 텍스트 | `muted` / `muted-foreground` |
| `orange` | 주황 배경, 주황 텍스트 | `orange-muted` / `orange-muted-foreground` |
| `outline` | 투명 배경, 테두리 | `border` / `foreground` |

#### Sizes

| size | 패딩 | 폰트 |
|------|------|------|
| `sm` (기본) | px-2 py-0.5 | text-xs |
| `md` | px-2.5 py-0.5 | text-sm |
| `lg` | px-3 py-1 | text-sm |

```tsx
<Badge variant="success" size="md">승인</Badge>
<Badge variant="warning">대기</Badge>
<Badge variant="error" size="lg">거부</Badge>
```

---

### Checkbox

`@/components/ui/checkbox`

크기 고정: `16x16px` (size-4)

#### 상태 스타일
- 기본: `input` 테두리, `card` 배경
- 호버: `primary` 테두리, `primary/5` 배경
- 체크됨: `primary` 테두리, `primary/5` 배경, `primary` 체크 아이콘
- 비활성: `muted` 테두리, `muted` 배경

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">약관 동의</Label>
</div>
```

---

### Label

`@/components/ui/label`

- 폰트: `text-sm font-medium`
- 비활성 상태에서 자동 `opacity-50` 적용

```tsx
<Label htmlFor="name">이름</Label>
```

---

### Textarea

`@/components/ui/textarea`

- 최소 높이: `min-h-16` (64px)
- `field-sizing-content` 지원 (콘텐츠에 맞게 자동 확장)
- size variant 없음 — `className`으로 높이 조절

```tsx
<Textarea placeholder="메모 입력" className="h-32" />
```

---

### Table

`@/components/ui/table`

| 하위 컴포넌트 | 스타일 |
|---------------|--------|
| `TableHeader` | `neutral-50` 배경 |
| `TableHead` | h-11, `text-xs font-medium text-neutral-500`, px-6 py-3 |
| `TableRow` | `neutral-200` 하단 테두리, 호버 시 `neutral-50/50` |
| `TableCell` | `text-sm`, px-6 py-4 |
| `TableFooter` | `neutral-50/50` 배경, 상단 테두리 |

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>상태</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>홍길동</TableCell>
      <TableCell><Badge variant="success">활성</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### Card

`@/components/ui/card`

- 둥글기: `rounded-2xl`
- 내부 gap: `gap-5`
- 수직 패딩: `py-4`
- 테두리: `border-border/60`
- 그림자: `shadow-sm`

| 하위 컴포넌트 | 패딩 | 스타일 |
|---------------|------|--------|
| `CardHeader` | px-6 | 그리드 레이아웃, `CardAction` 지원 |
| `CardTitle` | — | `font-semibold` |
| `CardDescription` | — | `text-sm text-muted-foreground` |
| `CardContent` | px-6 | — |
| `CardFooter` | px-6 | `flex items-center` |

```tsx
<Card>
  <CardHeader>
    <CardTitle>타설 현황</CardTitle>
    <CardDescription>최근 7일간 타설 기록</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

---

### Dialog

`@/components/ui/dialog`

- 최대 너비: `sm:max-w-lg`
- 오버레이: `bg-black/50`
- 애니메이션: fade-in + zoom-in-95
- `showCloseButton` prop (기본 `true`)

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명 텍스트</DialogDescription>
    </DialogHeader>
    {/* 내용 */}
    <DialogFooter>
      <Button variant="outline">취소</Button>
      <Button>확인</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### AlertDialog

`@/components/ui/alert-dialog`

확인/취소가 필요한 위험 액션에 사용합니다.

#### AlertDialogContent Sizes

| size | 최대 너비 |
|------|----------|
| `default` | `sm:max-w-lg` |
| `sm` | `max-w-xs` |

#### 특수 기능
- `AlertDialogMedia`: 아이콘 영역 (64x64px, `bg-muted`)
- `AlertDialogAction`: Button variant/size 직접 전달 가능
- `AlertDialogCancel`: 기본 `variant="outline"`

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">삭제</Button>
  </AlertDialogTrigger>
  <AlertDialogContent size="sm">
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction variant="destructive">삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Tabs

`@/components/ui/tabs`

#### TabsList Variants

| variant | 스타일 |
|---------|--------|
| `default` | `bg-muted` 배경, 선택 시 흰색 카드 |
| `line` | 투명 배경, 선택 시 하단 라인 |

- 방향 지원: `horizontal` (기본) / `vertical`

```tsx
<Tabs defaultValue="tab1">
  <TabsList variant="line">
    <TabsTrigger value="tab1">탭 1</TabsTrigger>
    <TabsTrigger value="tab2">탭 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">내용 1</TabsContent>
  <TabsContent value="tab2">내용 2</TabsContent>
</Tabs>
```

---

### DropdownMenu

`@/components/ui/dropdown-menu`

#### DropdownMenuItem Variants

| variant | 스타일 |
|---------|--------|
| `default` | `text-popover-foreground`, 호버 시 `accent` |
| `destructive` | `text-destructive`, 호버 시 `destructive/10` |

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontalIcon /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>수정</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Tooltip

`@/components/ui/tooltip`

- 배경: `popover-foreground` (어두운 배경)
- 텍스트: `text-xs font-semibold`, `popover` (밝은 색)
- 화살표 포함
- `delayDuration` 기본값: `0` (즉시 표시)

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>?</TooltipTrigger>
    <TooltipContent>도움말 텍스트</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Popover

`@/components/ui/popover`

- 너비: `w-72` (기본)
- `PopoverHeader`, `PopoverTitle`, `PopoverDescription` 하위 컴포넌트 지원

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">열기</Button>
  </PopoverTrigger>
  <PopoverContent>
    <PopoverHeader>
      <PopoverTitle>제목</PopoverTitle>
      <PopoverDescription>설명</PopoverDescription>
    </PopoverHeader>
  </PopoverContent>
</Popover>
```

---

### Calendar

`@/components/ui/calendar`

- `react-day-picker` 기반
- 셀 크기: `32x32px` (--cell-size: 2rem)
- `buttonVariant` prop으로 네비게이션 버튼 스타일 변경 가능
- 범위 선택, 다중 월 표시 지원

```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  locale={ko}
/>
```

---

### DateRangePicker

`@/components/ui/date-range-picker`

Calendar + Popover 조합의 날짜 범위 선택 컴포넌트입니다.

| prop | 타입 | 기본값 |
|------|------|--------|
| `numberOfMonths` | `1 \| 2` | `2` |
| `align` | `"start" \| "center" \| "end"` | `"end"` |
| `placeholder` | `string` | `"기간 선택"` |

- 적용/취소 버튼 포함
- 선택한 날짜 `M/d` 포맷으로 트리거에 표시

```tsx
<DateRangePicker
  value={range}
  onChange={setRange}
  numberOfMonths={2}
/>
```

---

### Command

`@/components/ui/command`

`cmdk` 기반 검색/명령 팔레트입니다.

- `CommandDialog`: Dialog 안에 Command를 렌더링
- `CommandInput`: 검색 아이콘 포함 입력
- `CommandList`: 최대 높이 `300px`, 스크롤

```tsx
<Command>
  <CommandInput placeholder="검색..." />
  <CommandList>
    <CommandEmpty>결과 없음</CommandEmpty>
    <CommandGroup heading="최근">
      <CommandItem>항목 1</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

---

### PhoneInput

`@/components/ui/phone-input`

국제 전화번호 입력 컴포넌트입니다.

- 국가 선택 드롭다운 (국기 + 국가번호)
- E.164 포맷 입/출력
- 기본 국가: 한국 (`kr`)
- `validatePhone()`, `formatPhone()` 유틸 함수 제공

```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  error={phoneError}
/>
```

---

### Separator

`@/components/ui/separator`

- 방향: `horizontal` (기본, 1px 높이) / `vertical` (1px 너비)
- 색상: `bg-border`

```tsx
<Separator />
<Separator orientation="vertical" className="h-6" />
```

---

### Slider

`@/components/ui/slider`

- 트랙 두께: `6px`
- 썸: `16x16px`, 흰색 배경, `border-primary`
- 방향: `horizontal` / `vertical`

```tsx
<Slider defaultValue={[25, 75]} min={0} max={100} />
```

---

### Sonner (Toast)

`@/components/ui/sonner`

`sonner` 라이브러리 기반 토스트 알림입니다.

#### 아이콘

| 타입 | 아이콘 |
|------|--------|
| `success` | CircleCheckIcon |
| `info` | InfoIcon |
| `warning` | TriangleAlertIcon |
| `error` | OctagonXIcon |
| `loading` | Loader2Icon (회전) |

```tsx
import { toast } from "sonner";

toast.success("저장되었습니다.");
toast.error("오류가 발생했습니다.");
toast.warning("주의가 필요합니다.");
```

---

### WriteOnly

`@/components/ui/write-only`

권한 기반 조건부 렌더링 컴포넌트입니다. 읽기 전용 사용자에게 쓰기 UI를 숨깁니다.

```tsx
<WriteOnly>
  <Button>새로 추가</Button>
</WriteOnly>

<WriteOnly fallback={<span>권한 없음</span>}>
  <Button variant="destructive">삭제</Button>
</WriteOnly>
```

---

## 공통 패턴

### 포커스 스타일

모든 인터랙티브 요소에 일관된 포커스 스타일을 적용합니다:

```
/* 폼 입력 (Input, Select, Checkbox) */
focus-visible:border-primary-light focus-visible:ring-[4px] focus-visible:ring-ring/15

/* 버튼, Badge, 기타 인터랙티브 요소 */
focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15
```

공통 규칙: `ring-[4px]` 두께, `ring-ring/15` 투명도. 테두리만 용도에 따라 `primary-light` 또는 `ring` 사용.

### 에러 스타일

유효성 검사 실패 시:

```
aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/15
```

### 비활성 스타일

```
disabled:pointer-events-none disabled:opacity-50
disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground
```

### 다크 모드

- `@custom-variant dark (&:is(.dark *))` 기반
- 모든 컴포넌트에 다크 모드 스타일 포함
- `next-themes` 사용

### 애니메이션

드롭다운, 팝오버, 다이얼로그 공통:

```
data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
data-[side=*]:slide-in-from-*-2
```

---

## 컴포넌트 크기 요약

| 컴포넌트 | size prop | 지원 값 |
|----------|-----------|---------|
| **Button** | `size` | `xs`, `sm`, `default`, `lg`, `xl`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` |
| **Input** | `size` | `default`, `sm` |
| **PasswordInput** | `size` | `default`, `sm` |
| **SelectTrigger** | `size` | `default`, `sm` |
| **Badge** | `size` | `sm`, `md`, `lg` |
| **AlertDialogContent** | `size` | `default`, `sm` |
| Checkbox | — | 고정 16x16px |
| Textarea | — | `className`으로 조절 |
| Table | — | 고정 스타일 |
| Card | — | `className`으로 조절 |
| Dialog | — | `className`으로 max-width 조절 |
