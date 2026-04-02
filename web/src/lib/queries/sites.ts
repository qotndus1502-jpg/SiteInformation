export interface SiteFilter {
  corporation?: string
  region?: string
  facilityType?: string
  orderType?: string
  division?: string
  status?: string
  search?: string
  amountRanges?: string   // comma-separated: "100-500,1000-2000"
  progressRanges?: string // comma-separated: "30-50,70-90"
}

export interface FilterOptions {
  corporations: string[]
  regions: string[]
  facilityTypes: string[]
  orderTypes: string[]
  divisions: string[]
  statuses: string[]
}
