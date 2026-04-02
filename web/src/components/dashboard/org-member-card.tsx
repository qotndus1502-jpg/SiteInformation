"use client";

import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";
import type { OrgMember } from "@/types/org-chart";

const ORG_TYPE_STYLE: Record<string, string> = {
  OWN: "border-primary/30 bg-primary/5",
  JV: "border-orange-300 bg-orange-50",
  SUB: "border-gray-300 bg-gray-50",
};

interface OrgMemberCardProps {
  member: OrgMember;
  primary?: boolean;
}

export function OrgMemberCard({ member, primary }: OrgMemberCardProps) {
  const borderStyle = ORG_TYPE_STYLE[member.org_type] ?? ORG_TYPE_STYLE.OWN;

  return (
    <div
      className={cn(
        "border rounded-xl text-center transition-all shadow-sm",
        borderStyle,
        primary ? "px-6 py-4 min-w-[180px]" : "px-4 py-3 min-w-[140px]"
      )}
    >
      {/* 직책 */}
      <p className={cn("font-semibold mb-0.5", primary ? "text-xs text-primary" : "text-[10px] text-primary")}>
        {member.role_name}
        {member.specialty && <span className="text-muted-foreground font-normal">({member.specialty})</span>}
      </p>
      {/* 회사 */}
      {member.company_name && (
        <p className="text-[10px] text-orange-600 font-medium">{member.company_name}</p>
      )}
      {/* 이름 + 직급 */}
      <p className={cn("font-bold", primary ? "text-base" : "text-sm")}>
        {member.name}
        {member.rank && <span className="text-xs text-muted-foreground font-normal ml-1">{member.rank}</span>}
      </p>
      {/* 전화번호 */}
      {member.phone && (
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
          <Phone className="h-2.5 w-2.5" />{member.phone}
        </p>
      )}
    </div>
  );
}
