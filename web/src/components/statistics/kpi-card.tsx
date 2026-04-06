"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Shield, Users, Wallet } from "lucide-react";

interface KpiCardProps {
  type: "progress" | "safety" | "headcount" | "budget";
  data: Record<string, any>;
}

const CONFIG = {
  progress: {
    title: "공정률",
    icon: TrendingUp,
    gradient: "from-blue-500 to-blue-700",
    shadow: "shadow-blue-500/30",
    edgeShadow: "rgba(37,99,235,0.5)",
  },
  safety: {
    title: "안전 등급",
    icon: Shield,
    gradient: "from-emerald-500 to-emerald-700",
    shadow: "shadow-emerald-500/30",
    edgeShadow: "rgba(16,185,129,0.5)",
  },
  headcount: {
    title: "투입 인원",
    icon: Users,
    gradient: "from-sky-500 to-sky-700",
    shadow: "shadow-sky-500/30",
    edgeShadow: "rgba(14,165,233,0.5)",
  },
  budget: {
    title: "예산 현황",
    icon: Wallet,
    gradient: "from-amber-500 to-amber-700",
    shadow: "shadow-amber-500/30",
    edgeShadow: "rgba(245,158,11,0.5)",
  },
};

function ProgressContent({ data }: { data: Record<string, any> }) {
  const pct = ((data.average ?? 0) * 100).toFixed(1);
  return (
    <>
      <p className="text-3xl font-bold">{pct}%</p>
      <div className="flex gap-3 text-xs text-white/80 mt-1">
        <span>정상 {data.on_track ?? 0}개</span>
        <span>지연 {data.delayed ?? 0}개</span>
      </div>
      <p className="text-xs text-white/60 mt-0.5">활성 현장 {data.total ?? 0}개</p>
    </>
  );
}

function SafetyContent({ data }: { data: Record<string, any> }) {
  const grades = [
    { label: "A", count: data.grade_a ?? 0, color: "bg-white/30" },
    { label: "B", count: data.grade_b ?? 0, color: "bg-white/25" },
    { label: "C", count: data.grade_c ?? 0, color: "bg-white/20" },
    { label: "D", count: data.grade_d ?? 0, color: "bg-white/15" },
  ];
  const total = grades.reduce((s, g) => s + g.count, 0);
  return (
    <>
      <p className="text-3xl font-bold">{total}개 현장</p>
      <div className="flex gap-2 mt-1">
        {grades.map((g) => (
          <div key={g.label} className={cn("px-2 py-0.5 rounded text-xs font-bold", g.color)}>
            {g.label}: {g.count}
          </div>
        ))}
      </div>
    </>
  );
}

function HeadcountContent({ data }: { data: Record<string, any> }) {
  const byDiv = data.by_division ?? {};
  return (
    <>
      <p className="text-3xl font-bold">{(data.total ?? 0).toLocaleString()}명</p>
      <div className="flex gap-3 text-xs text-white/80 mt-1">
        {Object.entries(byDiv).map(([div, count]) => (
          <span key={div}>{div} {(count as number).toLocaleString()}명</span>
        ))}
      </div>
    </>
  );
}

function BudgetContent({ data }: { data: Record<string, any> }) {
  const total = data.total_contract ?? 0;
  const ourShare = data.total_our_share ?? 0;
  const execRate = ((data.average_execution_rate ?? 0) * 100).toFixed(1);
  return (
    <>
      <p className="text-3xl font-bold">{total.toLocaleString()}억</p>
      <div className="flex gap-3 text-xs text-white/80 mt-1">
        <span>자사분 {ourShare.toLocaleString()}억</span>
        <span>실행률 {execRate}%</span>
      </div>
    </>
  );
}

const CONTENT_MAP = {
  progress: ProgressContent,
  safety: SafetyContent,
  headcount: HeadcountContent,
  budget: BudgetContent,
};

export function KpiCard({ type, data }: KpiCardProps) {
  const config = CONFIG[type];
  const Icon = config.icon;
  const Content = CONTENT_MAP[type];

  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 text-white overflow-hidden transition-all duration-300 cursor-default",
        "bg-gradient-to-br", config.gradient,
        "hover:[transform:perspective(800px)_rotateX(0deg)_rotateY(0deg)]",
        "[transform:perspective(800px)_rotateX(2deg)_rotateY(-2deg)]",
      )}
      style={{
        boxShadow: `0 4px 0 0 ${config.edgeShadow}, 0 8px 24px -4px rgba(0,0,0,0.25), 0 4px 8px -2px rgba(0,0,0,0.1)`,
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {/* Glass highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

      {/* Icon badge */}
      <div className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/80 mb-2">{config.title}</p>
        <Content data={data} />
      </div>
    </div>
  );
}
