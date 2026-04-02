"use client";

import { MapPin, Users, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SiteDashboard } from "@/types/database";
import { COMPANY_CONFIG, STATUS_CONFIG } from "@/types/database";

interface SiteCardProps {
  site: SiteDashboard;
  isSelected: boolean;
  onClick: () => void;
}

export function SiteCard({ site, isSelected, onClick }: SiteCardProps) {
  const progressPct = (site.progress_rate ?? 0) * 100;
  const companyConfig = COMPANY_CONFIG[site.corporation_name];
  const statusConfig = STATUS_CONFIG[site.status];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        {/* 뱃지 행 */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {companyConfig && (
            <Badge variant={companyConfig.variant} size="sm">{companyConfig.label}</Badge>
          )}
          <Badge variant="gray" size="sm">{site.facility_type_name}</Badge>
          {statusConfig && (
            <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
          )}
        </div>

        {/* 현장명 */}
        <h3 className="font-semibold text-sm text-foreground mb-2 line-clamp-1">
          {site.site_name}
        </h3>

        {/* 공정률 바 */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">공정률</span>
            <span className="text-xs font-mono font-semibold">
              {progressPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-primary"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {site.region_name}
          </span>
          {site.headcount != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {site.headcount}명
            </span>
          )}
          {site.contract_amount != null && (
            <span className="flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              {site.contract_amount.toLocaleString()}억
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
