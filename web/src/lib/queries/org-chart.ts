import type { Department, OrgMember, OrgRole, OrgTreeNode } from "@/types/org-chart"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001"

export async function fetchOrgChart(siteId: number): Promise<OrgMember[]> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/org-chart`)
  return res.json()
}

export async function fetchOrgRoles(): Promise<OrgRole[]> {
  const res = await fetch(`${API_BASE}/api/org-roles`)
  return res.json()
}

export async function fetchDepartments(siteId: number): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/departments`)
  return res.json()
}

async function handleMutation<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "요청 실패"
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {}
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export async function createDepartment(siteId: number, name: string): Promise<Department> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  return handleMutation<Department>(res)
}

export async function updateDepartment(
  deptId: number,
  patch: { name?: string; sort_order?: number; required_count?: number }
): Promise<Department> {
  const res = await fetch(`${API_BASE}/api/departments/${deptId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  return handleMutation<Department>(res)
}

export type RequiredHeadcount = {
  general: number
  specialist: number
  contract: number
  jv: number
}

export async function fetchRequiredHeadcount(siteId: number): Promise<RequiredHeadcount> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/required-headcount`)
  if (!res.ok) return { general: 0, specialist: 0, contract: 0, jv: 0 }
  return res.json()
}

export async function updateRequiredHeadcount(
  siteId: number,
  payload: RequiredHeadcount,
): Promise<RequiredHeadcount> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/required-headcount`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleMutation<RequiredHeadcount>(res)
}

export async function deleteDepartment(deptId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/departments/${deptId}`, { method: "DELETE" })
  await handleMutation<{ ok: boolean }>(res)
}

export type OrgMemberInput = {
  name: string
  role_id: number
  department_id: number | null
  parent_id: number | null
  org_type: "OWN" | "JV" | "SUB"
  employee_type: "일반직" | "전문직" | "현채직" | "공동사"
  company_name: string | null
  rank: string | null
  phone: string | null
  email: string | null
  sort_order?: number
  is_active?: boolean
}

export async function createOrgMember(
  siteId: number,
  payload: OrgMemberInput
): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/org-members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await handleMutation<unknown>(res)
  const row = Array.isArray(data) ? (data[0] as { id: number }) : (data as { id: number })
  return { id: row.id }
}

export async function updateOrgMember(
  memberId: number,
  patch: Partial<OrgMemberInput>
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/org-members/${memberId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  await handleMutation<unknown>(res)
}

export async function deleteOrgMember(memberId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/org-members/${memberId}`, { method: "DELETE" })
  await handleMutation<{ ok: boolean }>(res)
}

/** flat list -> tree */
export function buildOrgTree(members: OrgMember[]): OrgTreeNode[] {
  const map = new Map<number, OrgTreeNode>()
  const roots: OrgTreeNode[] = []

  for (const m of members) {
    map.set(m.id, { ...m, children: [] })
  }
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortChildren = (nodes: OrgTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach((n) => sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

/** 부서별로 그룹핑 (최상위 제외) */
export function groupByDepartment(members: OrgMember[]) {
  const topLevel = members.filter((m) => m.parent_id == null)
  const departments = new Map<string, OrgMember[]>()
  const noDept: OrgMember[] = []

  for (const m of members) {
    if (m.parent_id == null) continue
    const deptName = m.department_name ?? "기타"
    if (!departments.has(deptName)) departments.set(deptName, [])
    departments.get(deptName)!.push(m)
  }

  return { topLevel, departments, noDept }
}
