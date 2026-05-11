"use client";

import { Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ResumeAppointment,
  ResumeCertification,
  ResumeEducation,
  ResumeExperience,
} from "@/types/org-chart";

type Kind = "education" | "experience" | "appointment" | "certification";

type ItemMap = {
  education: ResumeEducation;
  experience: ResumeExperience;
  appointment: ResumeAppointment;
  certification: ResumeCertification;
};

const MAX_DESCRIPTION_NODES = 3;

interface FieldDef<K extends Kind> {
  key: keyof ItemMap[K];
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "month" | "nodes";
  /** col-span in 6-col grid (default 2) */
  span?: 1 | 2 | 3 | 4 | 5 | 6;
}

const FIELDS: { [K in Kind]: { title: string; addLabel: string; coreKey: keyof ItemMap[K]; fields: FieldDef<K>[] } } = {
  education: {
    title: "학력",
    addLabel: "+ 학력 추가",
    coreKey: "school_name",
    fields: [
      { key: "school_name", label: "학교명", placeholder: "예: 서울대학교", span: 3 },
      { key: "degree", label: "학위", placeholder: "학사/석사/박사", span: 3 },
      { key: "major", label: "전공", placeholder: "예: 건축공학", span: 3 },
      { key: "startDate", label: "시작", type: "month", span: 3 },
      { key: "endDate", label: "종료", type: "month", span: 3 },
    ],
  },
  experience: {
    title: "타사 경력",
    addLabel: "+ 타사 경력 추가",
    coreKey: "company",
    fields: [
      { key: "company", label: "회사명", placeholder: "예: ㅇㅇ건설", span: 3 },
      { key: "position", label: "직위", placeholder: "예: 대리", span: 3 },
      { key: "startDate", label: "시작", type: "month", span: 2 },
      { key: "endDate", label: "종료(빈값=현재)", type: "month", span: 2 },
      { key: "task", label: "직무", placeholder: "예: 시공관리", span: 2 },
      { key: "description", label: `업무 내용 (최대 ${MAX_DESCRIPTION_NODES}개)`, placeholder: "예: 시공계획 수립", type: "nodes", span: 6 },
    ],
  },
  appointment: {
    title: "자사 경력 (발령 이력)",
    addLabel: "+ 자사 경력 추가",
    coreKey: "date",
    fields: [
      { key: "date", label: "발령일자", type: "date", span: 2 },
      { key: "department", label: "부서", placeholder: "예: 공무팀", span: 2 },
      { key: "position", label: "직책", placeholder: "예: 팀장", span: 2 },
      { key: "description", label: `업무 내용 (최대 ${MAX_DESCRIPTION_NODES}개)`, placeholder: "예: 공정 관리 총괄", type: "nodes", span: 6 },
    ],
  },
  certification: {
    title: "자격증 및 면허",
    addLabel: "+ 자격증 추가",
    coreKey: "name",
    fields: [
      { key: "name", label: "자격증명", placeholder: "예: 건축기사", span: 3 },
      { key: "acquisition_date", label: "취득일", type: "date", span: 3 },
      { key: "issuer", label: "발급처", placeholder: "예: 한국산업인력공단", span: 3 },
      { key: "license_number", label: "자격번호", placeholder: "예: 12-345678", span: 3 },
    ],
  },
};

const EMPTY_ROW: { [K in Kind]: ItemMap[K] } = {
  education: { school_name: "", major: "", degree: "" },
  experience: { company: "", position: "", task: "", description: "" },
  appointment: { date: "", position: "", description: "" },
  certification: { name: "", acquisition_date: "", issuer: "" },
};

interface ResumeListEditorProps<K extends Kind> {
  kind: K;
  value: ItemMap[K][];
  onChange: (next: ItemMap[K][]) => void;
}

/**
 * description 같은 다중-노드 필드. value는 "\n" join된 string으로 부모에서 보관 —
 * employee-profile.tsx가 split("\n")로 표시하는 기존 스키마와 호환.
 * 최대 max개 노드. trailing 빈 노드도 입력 중에는 유지(저장 시 dropEmptyResumeRows에서 정리).
 */
function NodesField({
  value,
  onChange,
  max,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
}) {
  const raw = value === "" ? [""] : value.split("\n");
  const nodes = raw.slice(0, max);
  if (nodes.length === 0) nodes.push("");

  const update = (i: number, v: string) => {
    const next = nodes.slice();
    next[i] = v;
    onChange(next.join("\n"));
  };

  const add = () => {
    if (nodes.length >= max) return;
    onChange([...nodes, ""].join("\n"));
  };

  const remove = (i: number) => {
    const next = nodes.filter((_, idx) => idx !== i);
    onChange(next.length === 0 ? "" : next.join("\n"));
  };

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
          <Input
            value={node}
            placeholder={i === 0 ? placeholder : ""}
            onChange={(e) => update(i, e.target.value)}
            className="h-8! text-[12px]! py-1!"
          />
          {nodes.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="항목 삭제"
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {nodes.length < max && (
        <button
          type="button"
          onClick={add}
          className="ml-3 text-[11px] font-medium text-blue-700 hover:underline"
        >
          + 항목 추가 ({nodes.length}/{max})
        </button>
      )}
    </div>
  );
}

export function ResumeListEditor<K extends Kind>({ kind, value, onChange }: ResumeListEditorProps<K>) {
  const meta = FIELDS[kind];

  // Tailwind needs literal class names — map span → class.
  const SPAN_CLASS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
  };

  const updateField = (idx: number, key: keyof ItemMap[K], val: string) => {
    const next = value.slice();
    next[idx] = { ...next[idx], [key]: val } as ItemMap[K];
    onChange(next);
  };

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    onChange([...value, { ...EMPTY_ROW[kind] } as ItemMap[K]]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-foreground">{meta.title}</h4>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {meta.addLabel.replace(/^\+ /, "")}
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground/60 py-3 text-center border border-dashed rounded-md">
          항목이 없습니다. {meta.addLabel}
        </p>
      )}

      {value.map((row, idx) => (
        <div key={idx} className="rounded-md border border-border bg-muted/20 p-3 relative">
          <button
            type="button"
            onClick={() => removeRow(idx)}
            aria-label="행 삭제"
            className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <div className="grid grid-cols-6 gap-2 pr-7">
            {meta.fields.map((f) => {
              const span = f.span ?? 2;
              const rawValue = (row[f.key] as string | undefined) ?? "";
              return (
                <div key={String(f.key)} className={cn("flex flex-col gap-1", SPAN_CLASS[span])}>
                  <label className="text-[10px] font-medium text-muted-foreground">{f.label}</label>
                  {f.type === "nodes" ? (
                    <NodesField
                      value={rawValue}
                      max={MAX_DESCRIPTION_NODES}
                      placeholder={f.placeholder}
                      onChange={(v) => updateField(idx, f.key, v)}
                    />
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      value={rawValue}
                      placeholder={f.placeholder}
                      onChange={(e) => updateField(idx, f.key, e.target.value)}
                      className="h-8! text-[12px]! py-1!"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 저장 직전 클린업:
 *  - description 노드: 빈 라인 제거 + 최대 MAX_DESCRIPTION_NODES개로 제한
 *  - 핵심 키(coreKey)가 비어있는 row 제거
 */
export function dropEmptyResumeRows<K extends Kind>(kind: K, list: ItemMap[K][]): ItemMap[K][] {
  const coreKey = FIELDS[kind].coreKey;
  const normalized = list.map((row) => {
    const desc = (row as { description?: unknown }).description;
    if (typeof desc === "string") {
      const cleaned = desc
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_DESCRIPTION_NODES)
        .join("\n");
      return { ...row, description: cleaned } as ItemMap[K];
    }
    return row;
  });
  return normalized.filter((row) => {
    const v = row[coreKey];
    return typeof v === "string" && v.trim().length > 0;
  });
}
