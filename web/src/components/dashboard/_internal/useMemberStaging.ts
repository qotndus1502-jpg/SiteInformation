"use client";

import { useRef, useState } from "react";
import {
  createOrgMember,
  deleteOrgMember,
  updateOrgMember,
  type OrgMemberInput,
} from "@/lib/api/org";

/** All edits in the org-chart "members" mode are staged locally and only
 *  flushed to the server on save. Cancel discards the staging snapshot.
 *
 *  Why this complexity instead of "save each change immediately":
 *    - JV org charts can have many parent/child link changes; mixing partial
 *      saves with mid-edit reorders confuses the user.
 *    - Newly-staged members can have parent_id pointing at *other* newly-staged
 *      members (negative tempIds). Commit walks creates in order and rewires
 *      the tempId → real id mapping before sending.
 *
 *  Negative ids (`< 0`) identify staged-but-not-yet-created members. The
 *  ref-counter keeps them unique across a single editing session. */
export function useMemberStaging() {
  const [pendingCreates, setPendingCreates] = useState<Array<{ tempId: number; payload: OrgMemberInput }>>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Array<{ id: number; patch: OrgMemberInput }>>([]);
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const tempIdRef = useRef<number>(-1);

  const nextTempId = () => {
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    return id;
  };

  const clearPending = () => {
    setPendingCreates([]);
    setPendingUpdates([]);
    setPendingDeletes([]);
    tempIdRef.current = -1;
  };

  const hasPendingChanges =
    pendingCreates.length > 0 || pendingUpdates.length > 0 || pendingDeletes.length > 0;

  /** Add an insert / update to the staging queue based on memberId:
   *    null      → new member (assigns next negative tempId)
   *    negative  → edit a previously-staged insert
   *    positive  → edit an existing server member */
  const stageSubmit = (payload: OrgMemberInput, memberId: number | null) => {
    if (memberId == null) {
      const tempId = nextTempId();
      setPendingCreates((prev) => [...prev, { tempId, payload }]);
    } else if (memberId < 0) {
      setPendingCreates((prev) =>
        prev.map((p) => (p.tempId === memberId ? { ...p, payload } : p)),
      );
    } else {
      setPendingUpdates((prev) => {
        const exists = prev.find((u) => u.id === memberId);
        if (exists) {
          return prev.map((u) => (u.id === memberId ? { id: memberId, patch: payload } : u));
        }
        return [...prev, { id: memberId, patch: payload }];
      });
    }
  };

  /** Stage a delete. Negative memberId means "drop the staged insert"
   *  (no server roundtrip later); positive id means "delete on commit and
   *  drop any pending update for the same row". */
  const stageDelete = (memberId: number) => {
    if (memberId < 0) {
      setPendingCreates((prev) => prev.filter((p) => p.tempId !== memberId));
    } else {
      setPendingDeletes((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
      setPendingUpdates((prev) => prev.filter((u) => u.id !== memberId));
    }
  };

  /** Flush every staged change to the server in a deterministic order:
   *  deletes → updates → creates. Creates are walked in stage order so a
   *  child create that referenced a tempId parent can rewrite parent_id
   *  to the real id once the parent is created. */
  const commitBatch = async (siteId: number, onAfterCommit?: () => Promise<void>): Promise<void> => {
    if (savingBatch) return;
    if (!hasPendingChanges) return;
    setSavingBatch(true);
    try {
      for (const id of pendingDeletes) {
        await deleteOrgMember(id);
      }
      for (const u of pendingUpdates) {
        await updateOrgMember(u.id, u.patch);
      }
      const tempToReal = new Map<number, number>();
      for (const c of pendingCreates) {
        const payload: OrgMemberInput = { ...c.payload };
        if (payload.parent_id != null && payload.parent_id < 0) {
          payload.parent_id = tempToReal.get(payload.parent_id) ?? null;
        }
        const res = await createOrgMember(siteId, payload);
        tempToReal.set(c.tempId, res.id);
      }
      clearPending();
      if (onAfterCommit) await onAfterCommit();
    } finally {
      setSavingBatch(false);
    }
  };

  return {
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    savingBatch,
    hasPendingChanges,
    stageSubmit,
    stageDelete,
    commitBatch,
    clearPending,
  };
}
