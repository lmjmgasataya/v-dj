"use client";

import { useFormStatus } from "react-dom";

interface Props {
  label: string;
  pendingLabel?: string;
  className?: string;
}

export function SubmitButton({ label, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {pendingLabel ?? label}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
