"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type ManagingEntity,
  type AssignableSite,
  fetchManagingEntities,
  createManagingEntity,
  updateManagingEntity,
  deleteManagingEntity,
  fetchAssignableSites,
  assignSites,
} from "@/lib/api/managing-entities";
import { fetchCorporations, type Corporation } from "@/lib/api/lookup";
import { cn } from "@/lib/utils";

export default function ManagingEntitiesAdminPage() {
  const [corps, setCorps] = useState<Corporation[]>([]);
  const [entities, setEntities] = useState<ManagingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sites, setSites] = useState<AssignableSite[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [sitesLoading, setSitesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 새 주체 추가 폼
  const [newCorpId, setNewCorpId] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // 인라인 이름 수정
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, e] = await Promise.all([fetchCorporations(), fetchManagingEntities()]);
      setCorps(c);
      setEntities(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadSites = useCallback(async (entityId: number) => {
    setSitesLoading(true);
    try {
      const list = await fetchAssignableSites(entityId);
      setSites(list);
      setPicked(new Set(list.filter((s) => s.managing_entity_id === entityId).map((s) => s.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setSites([]);
      setPicked(new Set());
      return;
    }
    loadSites(selectedId);
  }, [selectedId, loadSites]);

  // 법인별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<number, { corp_id: number; corp_name: string; items: ManagingEntity[] }>();
    for (const e of entities) {
      const key = e.corporation_id;
      if (!map.has(key)) {
        map.set(key, { corp_id: key, corp_name: e.corporation_name ?? `법인 #${key}`, items: [] });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values()).sort((a, b) => a.corp_id - b.corp_id);
  }, [entities]);

  const selected = useMemo(() => entities.find((e) => e.id === selectedId) ?? null, [entities, selectedId]);

  const handleCreate = async () => {
    if (!newCorpId || !newName.trim()) {
      setError("법인과 이름을 입력하세요");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createManagingEntity({ corporation_id: Number(newCorpId), name: newName.trim() });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (e: ManagingEntity) => {
    setEditingId(e.id);
    setEditingName(e.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };
  const commitEdit = async () => {
    if (editingId == null) return;
    const name = editingName.trim();
    if (!name) { cancelEdit(); return; }
    try {
      await updateManagingEntity(editingId, { name });
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (e: ManagingEntity) => {
    const msg = e.site_count > 0
      ? `"${e.name}"을(를) 삭제할까요?\n현재 ${e.site_count}개 현장에 연결돼 있습니다 — 삭제 시 해당 현장의 현장관리부서는 비워집니다.`
      : `"${e.name}"을(를) 삭제할까요?`;
    if (!confirm(msg)) return;
    try {
      await deleteManagingEntity(e.id);
      if (selectedId === e.id) setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const togglePick = (siteId: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (selectedId == null) return;
    setSaving(true);
    setError(null);
    try {
      await assignSites(selectedId, Array.from(picked));
      // 저장 후 목록 새로고침 (site_count 갱신 + 다른 주체로부터 빼앗긴 사이트 반영)
      await Promise.all([load(), loadSites(selectedId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const initialPicked = useMemo(
    () => new Set(sites.filter((s) => s.managing_entity_id === selectedId).map((s) => s.id)),
    [sites, selectedId],
  );
  const dirty = useMemo(() => {
    if (initialPicked.size !== picked.size) return true;
    for (const id of picked) if (!initialPicked.has(id)) return true;
    return false;
  }, [initialPicked, picked]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold">현장관리부서 관리</h1>
        <Button variant="ghost" onClick={load} disabled={loading} className="h-7 px-2.5 text-[11px] font-normal">
          새로고침
        </Button>
      </div>

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-4">
        {/* ── 좌측: 현장관리부서 목록 + 추가 폼 ── */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border text-[12px] font-semibold text-muted-foreground">
            현장관리부서 목록
          </div>

          {/* 추가 폼 */}
          <div className="px-3 py-2.5 border-b border-border/60 flex flex-col gap-2 bg-muted/20">
            <div className="flex gap-2">
              <Select value={newCorpId} onValueChange={setNewCorpId}>
                <SelectTrigger
                  size="sm"
                  className="h-7! text-[11px]! font-normal! flex-1 [&_svg]:size-2.5!"
                >
                  <SelectValue placeholder="법인 선택" />
                </SelectTrigger>
                <SelectContent>
                  {corps.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-[11px]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="주체 이름 (예: 주택영업팀)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                className="!h-7 !text-[11px] !py-0 flex-1"
              />
              <Button
                onClick={handleCreate}
                disabled={creating || !newCorpId || !newName.trim()}
                size="sm"
                className="h-7 px-2.5 text-[11px] font-normal gap-1"
              >
                <Plus className="h-3 w-3" />
                추가
              </Button>
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-auto max-h-[calc(100vh-280px)]">
            {loading && entities.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">불러오는 중...</div>
            ) : entities.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                등록된 현장관리부서가 없습니다.
              </div>
            ) : (
              grouped.map((g) => (
                <div key={g.corp_id} className="border-b border-border/40 last:border-b-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {g.corp_name}
                  </div>
                  {g.items.map((e) => {
                    const isSelected = selectedId === e.id;
                    const isEditing = editingId === e.id;
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer border-b border-border/30 last:border-b-0",
                          isSelected ? "bg-primary/10" : "hover:bg-muted/40",
                        )}
                        onClick={() => !isEditing && setSelectedId(e.id)}
                      >
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={(ev) => setEditingName(ev.target.value)}
                              onClick={(ev) => ev.stopPropagation()}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") commitEdit();
                                if (ev.key === "Escape") cancelEdit();
                              }}
                              onBlur={commitEdit}
                              className="!h-6 !text-[12px] !py-0"
                            />
                          ) : (
                            <span className={cn("truncate", isSelected && "font-semibold")}>{e.name}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {e.site_count}개 현장
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}
                            className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="이름 수정"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); handleDelete(e); }}
                            className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 우측: 담당 현장 할당 ── */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="text-[12px] font-semibold text-muted-foreground">
              {selected
                ? <>담당 현장 — <span className="text-foreground">{selected.corporation_name} / {selected.name}</span></>
                : "담당 현장"}
            </div>
            {selected && (
              <Button
                size="sm"
                onClick={handleSaveAssignments}
                disabled={!dirty || saving || sitesLoading}
                className="h-7 px-3 text-[11px] font-normal"
              >
                {saving ? "저장 중..." : `저장 ${dirty ? `(${picked.size})` : ""}`}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto max-h-[calc(100vh-200px)]">
            {!selected ? (
              <div className="px-4 py-12 text-center text-[12px] text-muted-foreground">
                좌측에서 현장관리부서를 선택하세요.
              </div>
            ) : sitesLoading ? (
              <div className="px-4 py-12 text-center text-[12px] text-muted-foreground">불러오는 중...</div>
            ) : sites.length === 0 ? (
              <div className="px-4 py-12 text-center text-[12px] text-muted-foreground">
                {selected.corporation_name} 산하에 등록된 현장이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sites.map((s) => {
                  const checked = picked.has(s.id);
                  const otherEntityId = s.managing_entity_id != null && s.managing_entity_id !== selectedId
                    ? s.managing_entity_id : null;
                  const otherName = otherEntityId
                    ? entities.find((e) => e.id === otherEntityId)?.name ?? null : null;
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 px-3 py-2 text-[12px] cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePick(s.id)}
                      />
                      <span className="flex-1 truncate">{s.name}</span>
                      {otherName && !checked && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          현재: {otherName}
                        </span>
                      )}
                      {otherName && checked && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                          <X className="h-2.5 w-2.5" />
                          {otherName}에서 이동
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        * 현장관리부서의 법인과 다른 법인의 현장은 할당할 수 없습니다.
        한 현장은 한 현장관리부서만 가질 수 있어 다른 주체에서 가져오면 자동으로 옮겨집니다.
      </p>
    </div>
  );
}
