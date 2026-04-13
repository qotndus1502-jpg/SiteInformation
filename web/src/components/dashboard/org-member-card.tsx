"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { User, X, Camera, ZoomIn, ZoomOut, Check } from "lucide-react";
import type { OrgMember } from "@/types/org-chart";
import { useAuth } from "@/lib/auth-context";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";


interface PhotoSettings {
  x: number;
  y: number;
  scale: number;
}

function loadPhotoSettings(memberId: number): PhotoSettings {
  try {
    const raw = localStorage.getItem(`org-photo-${memberId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: 0, y: 0, scale: 1 };
}

function savePhotoSettings(memberId: number, s: PhotoSettings) {
  localStorage.setItem(`org-photo-${memberId}`, JSON.stringify(s));
}

interface OrgMemberCardProps {
  member: OrgMember;
  primary?: boolean;
  onSelect?: () => void;
}

export function OrgMemberCard({ member, primary, onSelect }: OrgMemberCardProps) {
  const { isAdmin } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imgSrc, setImgSrc] = useState(
    SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/org-photos/member_${member.id}.jpg` : null
  );
  const [settings, setSettings] = useState<PhotoSettings>(() => loadPhotoSettings(member.id));
  const [draft, setDraft] = useState<PhotoSettings>(settings);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const roleLabel = member.specialty
    ? `${member.role_name}(${member.specialty})`
    : member.role_name;

  const HEADER_ROLES = ["팀장", "품질관리자", "안전관리자"];
  const isLeader = HEADER_ROLES.includes(member.role_name);

  const current = editing ? draft : settings;
  const size = primary ? 200 : 180;

  // --- 업로드 ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("member_id", String(member.id));
    try {
      const res = await fetch(`${API_BASE}/api/upload-org-photo`, { method: "POST", body: formData });
      if (res.ok) {
        const reset = { x: 0, y: 0, scale: 1 };
        setImgSrc(`${SUPABASE_URL}/storage/v1/object/public/org-photos/member_${member.id}.jpg?t=${Date.now()}`);
        setImgError(false);
        setSettings(reset);
        setDraft(reset);
        savePhotoSettings(member.id, reset);
        setEditing(true);
      }
    } catch {}
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- 드래그 ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [editing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setDraft((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setDraft((prev) => ({ ...prev, scale: Math.max(0.3, Math.min(3, prev.scale + delta)) }));
  }, [editing]);

  const zoom = (delta: number) => {
    setDraft((prev) => ({ ...prev, scale: Math.max(0.3, Math.min(3, prev.scale + delta)) }));
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettings(draft);
    savePhotoSettings(member.id, draft);
    setEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(settings);
    setEditing(false);
  };

  const fileInput = <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />;

  return (
    <>
    {fileInput}
    <div
      onClick={() => { if (!editing && onSelect) onSelect(); }}
      className={cn(
        "overflow-hidden transition-all cursor-pointer hover:scale-[1.02]",
        primary ? "w-[260px]" : "w-[230px]"
      )}
    >
      {/* 사진 + 정보 세로 배치 */}
      <div className="p-2.5 flex flex-col items-center gap-2">
        {/* 사진 (회사 태그 겹침용 relative) */}
        <div className="relative group">
          <div
            className={cn(
              "rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 border-2 relative select-none",
              member.employee_type === "전문직" ? "border-green-500" :
              member.employee_type === "현채직" ? "border-sky-400" :
              member.org_type === "JV" ? "border-orange-400" :
              member.org_type === "OWN" ? "border-gray-300" : "border-gray-400",
            )}
            style={{ width: size, height: size }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {imgSrc && !imgError ? (
              <img
                src={imgSrc}
                alt={member.name}
                className="absolute pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                  width: "100%",
                  transform: `translate(-50%, -50%) translate(${current.x}px, ${current.y}px) scale(${current.scale})`,
                }}
                draggable={false}
                onError={() => setImgError(true)}
              />
            ) : (
              <User className="h-7 w-7 text-muted-foreground/30" />
            )}
          </div>

          {/* 편집 모드 UI */}
          {editing && (
            <>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/40 pointer-events-none" style={{ width: size, height: size }} />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-1 z-20">
                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors" title="사진 교체">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button onClick={(e) => { e.stopPropagation(); zoom(-0.1); }} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); zoom(0.1); }} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button onClick={handleCancel} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleSave} className="p-1.5 text-white hover:bg-primary/80 bg-primary rounded-full transition-colors">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {/* 카메라 버튼 — 관리자만 */}
          {!editing && isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setDraft(settings); setEditing(true); }}
              className="absolute bottom-1 right-1 p-1.5 bg-black/40 backdrop-blur-sm text-white/80 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:text-white transition-all z-10"
              title="사진 편집"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}

          {/* 태그 - 사진 상단에 겹침 */}
          {member.employee_type === "전문직" ? (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow z-10">
              전문직
            </span>
          ) : member.employee_type === "현채직" ? (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-sky-400 text-white text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow z-10">
              현채직
            </span>
          ) : member.company_name ? (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow z-10">
              {member.company_name}
            </span>
          ) : null}
        </div>

        {/* 정보 */}
        <div className="flex flex-col items-center gap-0.5">
          {/* 직책/직위 */}
          <p className="text-[22px] text-muted-foreground font-medium leading-none">
            {primary ? roleLabel : isLeader ? roleLabel : member.rank}
            {!isLeader && !primary && member.specialty && (
              <span>{`(${member.specialty})`}</span>
            )}
          </p>

          {/* 이름 */}
          <p className={cn("font-bold leading-tight", primary ? "text-lg" : "text-base")}>
            {member.name}
          </p>
        </div>
      </div>
    </div>

    </>
  );
}
