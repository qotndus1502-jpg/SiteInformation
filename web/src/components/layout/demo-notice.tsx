"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info } from "lucide-react";

const STORAGE_KEY = "demo-notice-dismissed-v1";

export function DemoNoticeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      /* SSR/private mode */
    }
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle className="self-start inline-flex items-center gap-1.5 text-[17px] bg-red-500 text-white px-3 py-1 rounded-md">
            <Info className="h-4 w-4" />
            데모 버전 안내
          </DialogTitle>
          <DialogDescription className="text-[16px] leading-relaxed text-slate-600 pt-2 space-y-2">
            <span className="block">
              현재 대시보드는 데모 버전으로, ERP와 연동되지 않은 임의 데이터로 구성되어 있습니다.
            </span>
            <span className="block">
              실제 현장 정보와 다르거나 누락·중복된 내용이 있을 수 있으니 참고용으로만 확인해 주시기 바랍니다.
            </span>
            <span className="block">
              <mark className="bg-yellow-200 text-slate-800 px-0.5">빠른 시일 내에 ERP 시스템과 연계하여 정확한 정보를 제공해 드리겠습니다.</mark>
            </span>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
