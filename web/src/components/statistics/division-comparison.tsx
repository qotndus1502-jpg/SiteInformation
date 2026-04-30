"use client";

import type { ComponentType } from "react";
import { HardHat, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DivisionData {
  division: string;
  count: number;
  avg_progress: number;
  total_contract: number;
  total_headcount: number;
}

interface DivisionComparisonProps {
  data: DivisionData[];
}

type IconComponent = ComponentType<{ className?: string }>;

const DIV_CONFIG: Record<string, { icon: IconComponent; color: string; bg: string }> = {
  "토목": { icon: HardHat, color: "text-emerald-600", bg: "bg-emerald-50" },
  "건축": { icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
};

export function DivisionComparison({ data }: DivisionComparisonProps) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4">부문별 비교</h3>
      <div className="grid grid-cols-2 gap-3">
        {data.map((d) => {
          const config = DIV_CONFIG[d.division] ?? { icon: Building2, color: "text-gray-600", bg: "bg-gray-50" };
          const Icon = config.icon;
          return (
            <div key={d.division} className={cn("rounded-xl p-4", config.bg)}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("h-5 w-5", config.color)} />
                <span className={cn("text-sm font-bold", config.color)}>{d.division}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">현장수</span>
                  <span className="font-bold font-mono">{d.count}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">평균공정률</span>
                  <span className="font-bold font-mono">{(d.avg_progress * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">총도급액</span>
                  <span className="font-bold font-mono">{d.total_contract.toLocaleString()}억</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">인원</span>
                  <span className="font-bold font-mono">{d.total_headcount.toLocaleString()}명</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
