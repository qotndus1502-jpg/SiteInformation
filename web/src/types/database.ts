/** v_site_dashboard 뷰 — pmis 스키마 대시보드 메인 데이터 */
export interface SiteDashboard {
  id: number
  site_name: string
  corporation_name: string
  corporation_code: string
  division: string           // 토목 | 건축
  category: string | null
  region_name: string
  region_group: string
  facility_type_name: string
  order_type: string | null
  client_name: string | null
  contract_amount: number | null   // 억원
  our_share_amount: number | null
  execution_rate: number | null    // 소수 (0.97 = 97%)
  execution_status: string | null
  execution_note: string | null
  progress_rate: number | null     // 소수 (0.87 = 87%)
  progress_note: string | null
  start_date: string | null
  end_date: string | null
  headcount: number | null
  office_address: string | null
  latitude: number | null
  longitude: number | null
  site_manager: string | null
  manager_position: string | null
  manager_phone: string | null
  pm_name: string | null
  pm_position: string | null
  status: SiteStatus
  risk_grade: RiskGrade | null
  delay_days: number | null
  jv_summary: string | null
  latest_memo: string | null
  managing_entity_id: number | null
  managing_entity_name: string | null
}

export type SiteStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "PRE_START"
export type RiskGrade = "A" | "B" | "C" | "D"

export const STATUS_CONFIG: Record<SiteStatus, { label: string; variant: "brand" | "gray" | "warning" | "orange" }> = {
  ACTIVE:    { label: "진행중",  variant: "brand" },
  PRE_START: { label: "착공전",  variant: "orange" },
  COMPLETED: { label: "준공",    variant: "gray" },
  SUSPENDED: { label: "중지",    variant: "warning" },
}

export const RISK_CONFIG: Record<RiskGrade, { label: string; variant: "error" | "warning" | "blue" | "success" }> = {
  A: { label: "A", variant: "error" },
  B: { label: "B", variant: "warning" },
  C: { label: "C", variant: "blue" },
  D: { label: "D", variant: "success" },
}

export const COMPANY_CONFIG: Record<string, { label: string; variant: "brand" | "success" | "orange" }> = {
  "남광토건": { label: "남광토건", variant: "success" },
  "극동건설": { label: "극동건설", variant: "brand" },
  "금광기업": { label: "금광기업", variant: "orange" },
}
