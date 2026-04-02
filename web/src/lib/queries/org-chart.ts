import type { OrgMember, OrgRole, OrgTreeNode } from "@/types/org-chart"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001"

export async function fetchOrgChart(siteId: number): Promise<OrgMember[]> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/org-chart`)
  return res.json()
}

export async function fetchOrgRoles(): Promise<OrgRole[]> {
  const res = await fetch(`${API_BASE}/api/org-roles`)
  return res.json()
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
