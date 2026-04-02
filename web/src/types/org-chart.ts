export interface OrgRole {
  id: number
  code: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface OrgMember {
  id: number
  site_id: number
  name: string
  rank: string | null
  phone: string | null
  email: string | null
  org_type: "OWN" | "JV" | "SUB"
  company_name: string | null
  employee_type: string | null
  role_id: number
  role_code: string
  role_name: string
  role_sort_order: number
  department_id: number | null
  department_name: string | null
  department_sort_order: number | null
  specialty: string | null
  parent_id: number | null
  sort_order: number
  is_active: boolean
  assigned_from: string | null
  assigned_to: string | null
  note: string | null
}

export type OrgTreeNode = OrgMember & {
  children: OrgTreeNode[]
}
