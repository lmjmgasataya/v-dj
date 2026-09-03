"use client";

import { useEffect, useRef, useState } from "react";

export function PinInput({
  name,
  length = 5,
  autoFocus = false,
}: {
  name: string;
  length?: number;
  autoFocus?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // The `autoFocus` attribute alone is unreliable here: this component usually
  // mounts after an async server action resolves (e.g. checkIdentity), so by the
  // time React commits, the browser is no longer inside the original tap's call
  // stack — mobile browsers can silently skip the focus. Re-assert it post-paint.
  useEffect(() => {
    if (!autoFocus) return;
    const raf = requestAnimationFrame(() => {
      inputsRef.current[0]?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [autoFocus]);

  function setDigit(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      let i = index;
      for (const digit of clean) {
        if (i >= length) break;
        next[i] = digit;
        i++;
      }
      const focusIndex = Math.min(i, length - 1);
      inputsRef.current[focusIndex]?.focus();
      return next;
    });
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={digits.join("")} />
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={digits[i]}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-12 text-center text-lg font-semibold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      ))}
    </div>
  );
}
