"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDepartments,
  fetchOrgChart,
  fetchOrgRoles,
  fetchRequiredHeadcount,
  type RequiredHeadcount,
} from "@/lib/api/org";
import type { Department, OrgMember, OrgRole } from "@/types/org-chart";

const EMPTY_REQUIRED: RequiredHeadcount = { general: 0, specialist: 0, contract: 0, jv: 0 };

/** Loads the four data slices the org-chart dialog needs (members,
 *  departments, roles, required headcount) in parallel and re-loads them
 *  whenever the dialog opens or the site changes.
 *
 *  Returns setters so callers can apply optimistic local updates (e.g.
 *  reordering departments before persisting) without re-fetching. */
export function useOrgChartData(siteId: number, open: boolean) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [requiredHeadcount, setRequiredHeadcount] = useState<RequiredHeadcount>(EMPTY_REQUIRED);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [orgData, deptData, roleData, requiredData] = await Promise.all([
        fetchOrgChart(siteId),
        fetchDepartments(siteId),
        fetchOrgRoles(),
        fetchRequiredHeadcount(siteId),
      ]);
      setMembers(orgData);
      setDepartments(deptData);
      setRoles(roleData);
      setRequiredHeadcount(requiredData);
    } catch {
      setMembers([]);
      setDepartments([]);
      setRoles([]);
      setRequiredHeadcount(EMPTY_REQUIRED);
    }
    setLoading(false);
  }, [open, siteId]);

  /** Refresh just the departments slice — used after rename / reorder /
   *  delete so the rest of the data isn't re-fetched. */
  const reloadDepartments = useCallback(async () => {
    try {
      const deptData = await fetchDepartments(siteId);
      setDepartments(deptData);
    } catch {
      /* noop */
    }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  return {
    members,
    departments,
    setDepartments,
    roles,
    requiredHeadcount,
    setRequiredHeadcount,
    loading,
    load,
    reloadDepartments,
  };
}
