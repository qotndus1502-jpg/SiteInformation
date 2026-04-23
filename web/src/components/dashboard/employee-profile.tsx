"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User, Phone, Mail, MapPin, Calendar, Pencil, ChevronLeft, X,
  GraduationCap, Smartphone,
} from "lucide-react";
import type { OrgMember, ResumeData } from "@/types/org-chart";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

interface ProfileApiResponse {
  member: OrgMember;
  resume: ResumeData;
  peers: { id: number; name: string; rank: string | null; role_name: string; phone_work?: string; photo_url?: string }[];
}

interface EmployeeProfileProps {
  memberId: number;
  siteName: string;
  onBack: () => void;
  onClose?: () => void;
  fallbackMember?: OrgMember | null;
  allMembers?: OrgMember[];
}

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const parts = birthDate.replace(/-/g, ".").split(".");
  if (parts.length < 3) return null;
  const birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcTenure(startDate: string | null | undefined): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) return `${years}년 ${rem}개월`;
  if (years > 0) return `${years}년`;
  return `${Math.max(rem, 1)}개월`;
}

function calcTotalExperience(experience: ResumeData["experience"], assignedFrom: string | null | undefined): string {
  let totalMonths = 0;
  for (const exp of (experience || [])) {
    const start = exp.startDate || exp.period?.split("~")[0]?.trim();
    const end = exp.endDate || exp.period?.split("~")[1]?.trim();
    if (!start) continue;
    const s = new Date(start.replace(/\./g, "-"));
    const e = end ? new Date(end.replace(/\./g, "-").replace(/\(.*\)/, "").trim()) : new Date();
    totalMonths += (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }
  if (assignedFrom) {
    const s = new Date(assignedFrom);
    const now = new Date();
    totalMonths += (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  }
  if (totalMonths <= 0) return "";
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  if (years > 0 && rem > 0) return `${years}년 ${rem}개월`;
  if (years > 0) return `${years}년`;
  return `${rem}개월`;
}

function getMemberPhoto(member: OrgMember): string | null {
  if (member.photo_url) return member.photo_url;
  if (SUPABASE_URL) return `${SUPABASE_URL}/storage/v1/object/public/org-photos/member_${member.id}.jpg`;
  return null;
}

export function EmployeeProfile({ memberId, siteName, onBack, onClose, fallbackMember, allMembers = [] }: EmployeeProfileProps) {
  const [data, setData] = useState<ProfileApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(memberId);
  const [imgError, setImgError] = useState(false);

  const loadProfile = useCallback(async (id: number) => {
    setLoading(true);
    setImgError(false);
    try {
      const res = await fetch(`${API_BASE}/api/org-members/${id}/profile`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(selectedId); }, [selectedId, loadProfile]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">불러오는 중...</div>;
  }

  // Build effective data — use API response or fallback to org chart data
  const currentFallback = allMembers.find((m) => m.id === selectedId) ?? fallbackMember;

  const member: OrgMember = data?.member ?? currentFallback ?? {
    id: selectedId, site_id: 0, name: "?", rank: null, phone: null, email: null,
    org_type: "OWN" as const, company_name: null, employee_type: null,
    role_id: 0, role_code: "", role_name: "", role_sort_order: 0,
    department_id: null, department_name: null, department_sort_order: null,
    specialty: null, parent_id: null, sort_order: 0, is_active: true,
    assigned_from: null, assigned_to: null, note: null,
  };
  const resume: ResumeData = data?.resume ?? { education: [], certifications: [], experience: [], appointmentHistory: [] };

  // Build peers from API or from allMembers (same department)
  const peers = data?.peers ?? (() => {
    if (!currentFallback) return [];
    const dept = currentFallback.department_id;
    if (dept) {
      return allMembers.filter((m) => m.department_id === dept).sort((a, b) => a.sort_order - b.sort_order);
    }
    return allMembers.filter((m) => m.parent_id == null).sort((a, b) => a.sort_order - b.sort_order);
  })();
  const photoSrc = getMemberPhoto(member);
  const age = calcAge(member.birth_date);
  const tenure = calcTenure(member.assigned_from);
  const totalExp = calcTotalExperience(resume.experience || [], member.assigned_from);
  const skills = member.skills ? member.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const internalCareers = resume.appointmentHistory || [];
  const externalCareers = resume.experience || [];
  const educations = resume.education || [];
  const certifications = resume.certifications || [];

  return (
    <div className="relative flex h-full">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {/* ── Left sidebar: peers ── */}
      <div className="w-[200px] shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="px-4 pt-4 pb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            나가기
          </button>
        </div>
        <div className="px-4 pb-3 border-b border-border">
          <h3 className="text-[13px] font-bold leading-tight">{member.department_name ?? member.role_name}</h3>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{siteName}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {peers.map((p) => {
            const isActive = p.id === selectedId;
            const peerPhoto = (p as any).photo_url
              || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/org-photos/member_${p.id}.jpg` : null);
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  isActive ? "bg-primary/10 border-r-2 border-primary" : "hover:bg-muted/60"
                )}
              >
                <div className="w-7 h-9 rounded-md overflow-hidden bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                  {peerPhoto ? (
                    <img src={peerPhoto} alt={p.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : null}
                  <User className={cn("h-3.5 w-3.5 text-slate-300", peerPhoto && "hidden")} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-[11px] font-semibold truncate leading-tight", isActive && "text-primary")}>{p.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                    {p.rank}{p.role_name ? ` · ${p.role_name}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-6 p-6 min-h-full">
          {/* ── Profile card ── */}
          <div className="w-[280px] shrink-0 space-y-4">
            {member.job_category && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-red-500">{member.job_category}</span>
              </div>
            )}

            <div className="flex justify-center">
              <div className="w-[200px] h-[240px] rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                {photoSrc && !imgError ? (
                  <img src={photoSrc} alt={member.name} className="w-full h-full object-cover"
                    onError={() => setImgError(true)} />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground/20" />
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[18px]">
                <span className="font-bold">{member.name}</span>{" "}
                <span className="text-muted-foreground">{member.rank}</span>
                {age != null && <span className="text-muted-foreground text-[14px] ml-1">({age}세)</span>}
              </p>
            </div>

            {(tenure || totalExp) && (
              <div className="flex rounded-lg border border-border overflow-hidden text-center divide-x divide-border">
                {tenure && (
                  <div className="flex-1 py-2.5">
                    <p className="text-[14px] font-bold">{tenure}</p>
                    <p className="text-[11px] text-muted-foreground">근속</p>
                  </div>
                )}
                {totalExp && (
                  <div className="flex-1 py-2.5">
                    <p className="text-[14px] font-bold">{totalExp}</p>
                    <p className="text-[11px] text-muted-foreground">경력</p>
                  </div>
                )}
              </div>
            )}

            {educations.length > 0 && (
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[12px] font-medium text-muted-foreground">학력</h4>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  {educations.map((edu, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold">{edu.school_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[edu.major, edu.degree].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sections ── */}
          <div className="flex-1 space-y-8 min-w-0">

            {/* CAREER */}
            <section>
              <h2 className="text-[15px] font-black tracking-wide mb-4">CAREER</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">자사 경력</h3>
                  <div className="space-y-3">
                    {internalCareers.length === 0 && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center">등록된 경력이 없습니다</p>
                    )}
                    {internalCareers.map((c, i) => (
                      <div key={i} className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {i === 0 && <span className="text-[11px] font-bold text-white bg-primary px-2 py-0.5 rounded">NOW</span>}
                          <span className="text-[12px] font-semibold">
                            {[c.department, c.position, c.date].filter(Boolean).join(" | ")}
                          </span>
                        </div>
                        {c.description?.split("\n").filter((l: string) => l.trim()).map((desc: string, j: number) => (
                          <p key={j} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                            {desc.replace(/^★/, "").trim()}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">타사 경력</h3>
                  <div className="space-y-3">
                    {externalCareers.length === 0 && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center">등록된 경력이 없습니다</p>
                    )}
                    {externalCareers.map((c, i) => {
                      const period = (() => {
                        const s = c.startDate || c.period?.split("~")[0]?.trim();
                        const e = c.endDate || c.period?.split("~")[1]?.trim();
                        if (!s) return "";
                        return `${s} ~ ${e || "현재"}`;
                      })();
                      return (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-[12px] font-semibold mb-2">
                            {c.company}{c.position && ` | ${c.position}`}{period && ` | ${period}`}
                          </p>
                          {c.description?.split("\n").filter((l) => l.trim()).map((desc, j) => (
                            <p key={j} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              {desc.replace(/^★/, "").trim()}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* SKILLS */}
            <section>
              <h2 className="text-[15px] font-black tracking-wide mb-4">SKILLS</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">자격증 및 면허</h3>
                  <div className="space-y-3">
                    {certifications.length === 0 && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center">등록된 자격증이 없습니다</p>
                    )}
                    {certifications.map((cert, i) => (
                      <div key={i} className="border border-border rounded-lg p-4">
                        <p className="text-[12px] font-bold">{cert.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[cert.acquisition_date, cert.issuer].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">스킬</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.length === 0 && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center w-full">등록된 스킬이 없습니다</p>
                    )}
                    {skills.map((skill) => (
                      <span key={skill} className="px-4 py-2 bg-muted rounded-lg text-[12px] font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* INFORMATION */}
            <section>
              <h2 className="text-[15px] font-black tracking-wide mb-4">INFORMATION</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">인사정보</h3>
                  <div className="space-y-3">
                    {member.birth_date && (
                      <div className="flex items-center gap-3 text-[12px]">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{member.birth_date}</span>
                      </div>
                    )}
                    {member.address && (
                      <div className="flex items-center gap-3 text-[12px]">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{member.address}</span>
                      </div>
                    )}
                    {!member.birth_date && !member.address && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center">등록된 정보가 없습니다</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-semibold text-muted-foreground mb-3">연락처</h3>
                  <div className="space-y-3">
                    {member.phone_work && (
                      <div className="flex items-center gap-3 text-[12px]">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{member.phone_work}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-3 text-[12px]">
                        <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a href={`tel:${member.phone}`} className="text-primary hover:underline">{member.phone}</a>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-3 text-[12px]">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a href={`mailto:${member.email}`} className="text-primary hover:underline">{member.email}</a>
                      </div>
                    )}
                    {!member.phone_work && !member.phone && !member.email && (
                      <p className="text-[12px] text-muted-foreground/50 py-4 text-center">등록된 연락처가 없습니다</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}
