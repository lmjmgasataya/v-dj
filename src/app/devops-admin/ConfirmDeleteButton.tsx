"use client";

import { useRef } from "react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  hiddenFields?: Record<string, string>;
  message?: string;
}

export function ConfirmDeleteButton({ action, hiddenFields, message = "Are you sure you want to delete this?" }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm(message)) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={action}>
      {hiddenFields && Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="button"
        onClick={handleClick}
        className="text-xs px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
      >
        Delete
      </button>
    </form>
  );
}
