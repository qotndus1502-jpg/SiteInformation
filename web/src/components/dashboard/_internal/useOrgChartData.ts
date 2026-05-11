"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDepartments,
  fetchOrgChartBundle,
  type RequiredHeadcount,
} from "@/lib/api/org";
import type { Department, OrgMember, OrgRole } from "@/types/org-chart";

const EMPTY_REQUIRED: RequiredHeadcount = { general: 0, specialist: 0, contract: 0, jv: 0 };

interface BundleSnapshot {
  members: OrgMember[];
  departments: Department[];
  roles: OrgRole[];
  requiredHeadcount: RequiredHeadcount;
}

/** Module-scoped stale-while-revalidate cache, keyed by siteId. The dialog
 *  is opened repeatedly per session — without this, every reopen pays for
 *  a fresh four-table round-trip even when the underlying data is unchanged.
 *  We render cached data immediately (loading=false) and revalidate in the
 *  background; mutations call `load()` which always overwrites the cache. */
const bundleCache = new Map<number, BundleSnapshot>();

/** Loads the four data slices the org-chart dialog needs in a single
 *  bundled backend call, with a module-scoped cache so reopens are
 *  instant. Returns setters so callers can apply optimistic local updates
 *  (e.g. reordering departments before persisting) without re-fetching. */
export function useOrgChartData(siteId: number, open: boolean) {
  const cached = bundleCache.get(siteId);
  const [members, setMembers] = useState<OrgMember[]>(cached?.members ?? []);
  const [departments, setDepartmentsState] = useState<Department[]>(cached?.departments ?? []);
  const [roles, setRoles] = useState<OrgRole[]>(cached?.roles ?? []);
  const [requiredHeadcount, setRequiredHeadcountState] = useState<RequiredHeadcount>(
    cached?.requiredHeadcount ?? EMPTY_REQUIRED,
  );

  // Write-through setters keep the module cache in sync with optimistic local
  // updates (e.g. department reorder, required-headcount edit). Without this
  // the next dialog open would render stale cached values for a frame before
  // revalidation finishes.
  const setDepartments: typeof setDepartmentsState = useCallback((value) => {
    setDepartmentsState((prev) => {
      const next = typeof value === "function" ? (value as (p: Department[]) => Department[])(prev) : value;
      const snap = bundleCache.get(siteId);
      if (snap) bundleCache.set(siteId, { ...snap, departments: next });
      return next;
    });
  }, [siteId]);
  const setRequiredHeadcount: typeof setRequiredHeadcountState = useCallback((value) => {
    setRequiredHeadcountState((prev) => {
      const next = typeof value === "function" ? (value as (p: RequiredHeadcount) => RequiredHeadcount)(prev) : value;
      const snap = bundleCache.get(siteId);
      if (snap) bundleCache.set(siteId, { ...snap, requiredHeadcount: next });
      return next;
    });
  }, [siteId]);
  // Only show the skeleton when there's no cached snapshot — otherwise the
  // user already sees plausible content while we revalidate in the background.
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    if (!open) return;
    if (!bundleCache.has(siteId)) setLoading(true);
    try {
      const bundle = await fetchOrgChartBundle(siteId);
      const snapshot: BundleSnapshot = {
        members: bundle.members,
        departments: bundle.departments,
        roles: bundle.roles,
        requiredHeadcount: bundle.required_headcount,
      };
      bundleCache.set(siteId, snapshot);
      setMembers(snapshot.members);
      setDepartmentsState(snapshot.departments);
      setRoles(snapshot.roles);
      setRequiredHeadcountState(snapshot.requiredHeadcount);
    } catch {
      if (!bundleCache.has(siteId)) {
        setMembers([]);
        setDepartmentsState([]);
        setRoles([]);
        setRequiredHeadcountState(EMPTY_REQUIRED);
      }
    }
    setLoading(false);
  }, [open, siteId]);

  /** Refresh just the departments slice — used after rename / reorder /
   *  delete so the rest of the data isn't re-fetched. Updates the cached
   *  snapshot so the next dialog open sees the change immediately. */
  const reloadDepartments = useCallback(async () => {
    try {
      const deptData = await fetchDepartments(siteId);
      setDepartments(deptData);
    } catch {
      /* noop */
    }
  }, [siteId, setDepartments]);

  // Site switch: snap state to whatever the new site's cache holds (or
  // empty if uncached) so the user never sees the previous site's chart
  // for a frame. The follow-up revalidation runs via the load() effect.
  useEffect(() => {
    const snap = bundleCache.get(siteId);
    setMembers(snap?.members ?? []);
    setDepartmentsState(snap?.departments ?? []);
    setRoles(snap?.roles ?? []);
    setRequiredHeadcountState(snap?.requiredHeadcount ?? EMPTY_REQUIRED);
    setLoading(!snap);
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
