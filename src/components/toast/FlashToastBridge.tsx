"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast, type ToastType } from "./ToastProvider";

export function FlashToastBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const message = searchParams.get("toast");
    const type = searchParams.get("toastType") as ToastType | null;
    if (!message) return;

    const key = `${pathname}|${message}|${type ?? ""}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    toast.show(message, type ?? "success");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    params.delete("toastType");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]);

  return null;
}
