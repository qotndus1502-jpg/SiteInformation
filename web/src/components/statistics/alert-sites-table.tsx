"use client";

import { AlertTriangle } from "lucide-react";

interface AlertSite {
  id: number;
  site_name: string;
  corporation_name: string;
  progress_rate: number | null;
  delay_days: number;
  risk_grade: string | null;
  contract_amount: number | null;
}

interface AlertSitesTableProps {
  data: AlertSite[];
}

const RISK_COLORS: Record<string, string> = {
  A: "bg-red-100 text-red-700",
  B: "bg-yellow-100 text-yellow-700",
  C: "bg-orange-100 text-orange-700",
  D: "bg-red-200 text-red-800",
};

export function AlertSitesTable({ data }: AlertSitesTableProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          주의 현장
        </h3>
        <p className="text-sm text-muted-foreground text-center py-6">주의가 필요한 현장이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        주의 현장
        <span className="text-xs font-normal text-muted-foreground ml-1">({data.length}개)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-3 font-medium">현장명</th>
              <th className="text-left py-2 px-3 font-medium">법인</th>
              <th className="text-right py-2 px-3 font-medium">공정률</th>
              <th className="text-right py-2 px-3 font-medium">지연일수</th>
              <th className="text-center py-2 px-3 font-medium">리스크</th>
              <th className="text-right py-2 px-3 font-medium">도급액</th>
            </tr>
          </thead>
          <tbody>
            {data.map((site) => (
              <tr key={site.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-medium text-foreground max-w-[200px] truncate">{site.site_name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{site.corporation_name}</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {site.progress_rate != null ? `${(site.progress_rate * 100).toFixed(1)}%` : "-"}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {site.delay_days > 0 ? (
                    <span className="text-red-600 font-semibold">{site.delay_days}일</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {site.risk_grade ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${RISK_COLORS[site.risk_grade] ?? ""}`}>
                      {site.risk_grade}
                    </span>
                  ) : "-"}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                  {site.contract_amount != null ? `${site.contract_amount.toLocaleString()}억` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
