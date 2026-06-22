"use client";

import { useTransition } from "react";
import { updateMessageTemplate, deleteMessageTemplate } from "./actions";
import { inputCls } from "@/components/form";
import type { SmsMessageTemplate } from "@/db/schema";

export function EditTemplateForm({ template }: { template: SmsMessageTemplate }) {
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(() => updateMessageTemplate(template.id, formData));
  }

  function handleDelete() {
    if (!confirm(`Delete "${template.title}"? This cannot be undone.`)) return;
    startDelete(() => deleteMessageTemplate(template.id));
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
          defaultValue={template.title}
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
          defaultValue={template.message}
          className={inputCls + " bg-white resize-none"}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deletePending}
          className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50"
        >
          {deletePending ? "Deleting..." : "Delete template"}
        </button>

        <div className="flex gap-3">
          <a
            href="/sms-sender/message-templates"
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={savePending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {savePending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
