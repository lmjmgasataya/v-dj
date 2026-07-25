"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 10000;

const STYLES: Record<ToastType, { bg: string; text: string; bar: string; icon: string }> = {
  success: { bg: "bg-green-50 border-green-200", text: "text-green-800", bar: "bg-green-400", icon: "✅" },
  error: { bg: "bg-red-50 border-red-200", text: "text-red-800", bar: "bg-red-400", icon: "❌" },
  info: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", bar: "bg-amber-400", icon: "ℹ️" },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [shrink, setShrink] = useState(false);
  const styles = STYLES[toast.type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShrink(true));
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`pointer-events-auto overflow-hidden rounded-lg border shadow-lg ${styles.bg}`}>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <span className={`text-sm ${styles.text}`}>
          {styles.icon} {toast.message}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className={`shrink-0 font-medium hover:opacity-70 ${styles.text}`}
        >
          ✕
        </button>
      </div>
      <div className="h-1 bg-black/10">
        <div
          className={`h-full ${styles.bar} transition-[width] ease-linear`}
          style={{ width: shrink ? "0%" : "100%", transitionDuration: `${TOAST_DURATION_MS}ms` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
