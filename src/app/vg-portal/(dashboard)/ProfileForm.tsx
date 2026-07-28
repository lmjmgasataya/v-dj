"use client";

import { useTransition } from "react";
import { updateOwnProfile } from "./actions";
import { Field, Section, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";
import type { VictoryGroupLeader } from "@/db/schema";
import { lifestageEnum } from "@/db/schema";
import { useToast } from "@/components/toast/ToastProvider";

export function ProfileForm({ leader }: { leader: VictoryGroupLeader }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateOwnProfile(formData);
      toast.show("Profile updated.", "success");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="My Information" description="Your name is on file with an admin — contact one to change it.">
        <Field label="Name">
          <p className="text-sm text-gray-700 py-2">
            {leader.lastName}, {leader.firstName} {leader.middleInitial ?? ""}
          </p>
        </Field>
        <Field label="Mobile Number" required>
          <input name="mobileNumber" required defaultValue={leader.mobileNumber} className={inputCls} />
        </Field>
        <Field label="Age">
          <input name="age" type="number" min={1} max={120} defaultValue={leader.age ?? ""} className={inputCls} />
        </Field>
        <Field label="Gender">
          <select name="gender" defaultValue={leader.gender ?? ""} className={selectCls}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Lifestage">
          <select name="lifestage" defaultValue={leader.lifestage ?? ""} className={selectCls}>
            <option value="">— Select —</option>
            {lifestageEnum.enumValues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Service Attending">
          <select name="serviceAttending" defaultValue={leader.serviceAttending ?? ""} className={selectCls}>
            <option value="">— Select —</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Facebook / Messenger Name" className="sm:col-span-2">
          <input
            name="facebookMessengerName"
            defaultValue={leader.facebookMessengerName ?? ""}
            className={inputCls}
            placeholder="e.g. Juan dela Cruz"
          />
        </Field>
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
