"use client";

import { SiteCard } from "./site-card";
import type { SiteDashboard } from "@/types/database";

interface SiteCardGridProps {
  sites: SiteDashboard[];
  selectedSiteId: number | null;
  onSelect: (site: SiteDashboard) => void;
}

export function SiteCardGrid({ sites, selectedSiteId, onSelect }: SiteCardGridProps) {
  if (sites.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">검색 결과가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
      {sites.map((site) => (
        <SiteCard
          key={site.id}
          site={site}
          isSelected={selectedSiteId === site.id}
          onClick={() => onSelect(site)}
        />
      ))}
    </div>
  );
}
