"use client";

import { useTransition } from "react";
import { createMessageTemplate } from "./actions";
import { inputCls } from "@/components/form";

export function NewTemplateForm() {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => createMessageTemplate(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          placeholder="e.g. Session Reminder"
          className={inputCls + " bg-white"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={12}
          placeholder="Type your message here…"
          className={inputCls + " bg-white resize-none"}
        />
      </div>

      <div className="flex justify-end gap-3">
        <a
          href="/sms-sender/message-templates"
          className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          {pending ? "Saving..." : "Save Template"}
        </button>
      </div>
    </form>
  );
}
