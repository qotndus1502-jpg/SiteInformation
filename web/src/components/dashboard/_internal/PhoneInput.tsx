"use client";

import { Check } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 휴대폰: 단일 input 안에서 자동 "-" 마스킹 (3-4-4)
// ─────────────────────────────────────────────────────────────────────────────

function formatPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function PhoneInput({
  id,
  value,
  onChange,
  className,
  placeholder = "010-0000-0000",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      value={value}
      inputMode="numeric"
      maxLength={13}
      placeholder={placeholder}
      onChange={(e) => onChange(formatPhone(e.target.value.replace(/\D/g, "")))}
      className={className}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 회사 전화: [지역번호 ▼] [국번-번호] — 국번-번호는 4-4 자동 마스킹
// ─────────────────────────────────────────────────────────────────────────────

const AREA_CODES: { value: string; region: string }[] = [
  { value: "02", region: "서울" },
  { value: "031", region: "경기" },
  { value: "032", region: "인천" },
  { value: "033", region: "강원" },
  { value: "041", region: "충남" },
  { value: "042", region: "대전" },
  { value: "043", region: "충북" },
  { value: "044", region: "세종" },
  { value: "051", region: "부산" },
  { value: "052", region: "울산" },
  { value: "053", region: "대구" },
  { value: "054", region: "경북" },
  { value: "055", region: "경남" },
  { value: "061", region: "전남" },
  { value: "062", region: "광주" },
  { value: "063", region: "전북" },
  { value: "064", region: "제주" },
];

const AREA_CODE_SET = new Set(AREA_CODES.map((a) => a.value));

function formatWorkRest(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

export function WorkPhoneInput({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  // value = "02-1234-5678" → area="02", rest="1234-5678"
  const parts = value.split("-");
  const area = AREA_CODE_SET.has(parts[0] ?? "") ? parts[0]! : "";
  const rest = area ? parts.slice(1).join("-") : value;

  const compose = (na: string, nrest: string): string => {
    if (!na && !nrest) return "";
    if (!nrest) return na;
    if (!na) return nrest;
    return `${na}-${nrest}`;
  };

  const setArea = (newArea: string) => {
    onChange(compose(newArea, rest));
  };

  const setRest = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    onChange(compose(area, formatWorkRest(digits)));
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={area} onValueChange={setArea}>
        <SelectTrigger className="w-[78px] h-9! text-[12px]! px-2! shrink-0">
          <SelectValue placeholder="지역" />
        </SelectTrigger>
        <SelectContent>
          {AREA_CODES.map((a) => (
            <SelectPrimitive.Item
              key={a.value}
              value={a.value}
              className={cn(
                "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-6 pl-2 text-[11px] font-medium text-foreground outline-hidden select-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              )}
            >
              <SelectPrimitive.ItemText>
                <span className="font-medium tabular-nums">{a.value}</span>
              </SelectPrimitive.ItemText>
              <span className="text-muted-foreground">{a.region}</span>
              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-3.5 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </span>
            </SelectPrimitive.Item>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        value={rest}
        inputMode="numeric"
        maxLength={9}
        placeholder="0000-0000"
        onChange={(e) => setRest(e.target.value)}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
