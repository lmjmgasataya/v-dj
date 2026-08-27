"use client";

import { useTransition } from "react";
import { updateOwnProfile } from "./actions";
import { Field, Section, CheckboxOption, inputCls, selectCls, SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { OwnVgLeaderField } from "@/components/OwnVgLeaderField";
import type { VictoryGroupLeader } from "@/db/schema";
import { lifestageEnum } from "@/db/schema";
import { useToast } from "@/components/toast/ToastProvider";
import { computeProfileProgress } from "@/lib/profileCompleteness";

export function ProfileForm({ leader, hasActiveGroup }: { leader: VictoryGroupLeader; hasActiveGroup: boolean }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const { percent, missing } = computeProfileProgress(leader, hasActiveGroup);

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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Profile Setup</p>
          <p className="text-sm font-semibold text-gray-800">{percent}%</p>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${percent === 100 ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Still missing: <span className="text-gray-700">{missing.join(", ")}</span>
          </p>
        )}
      </div>

      <Section title="My Information" description="Your last name is on file with an admin — contact one to change it.">
        <Field label="Last Name">
          <p className="text-sm text-gray-700 py-2">{leader.lastName}</p>
        </Field>
        <Field label="First Name" required>
          <input name="firstName" required defaultValue={leader.firstName} className={inputCls} />
        </Field>
        <Field label="Nickname">
          <input name="nickname" defaultValue={leader.nickname ?? ""} className={inputCls} />
        </Field>
        <Field label="Mobile Number" required>
          <input name="mobileNumber" required defaultValue={leader.mobileNumber ?? ""} className={inputCls} />
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
        <OwnVgLeaderField
          excludeId={leader.id}
          defaultName={leader.ownVgLeaderName ?? ""}
          defaultId={leader.ownVgLeaderId}
        />
      </Section>

      <Section title="Discipleship Journey" description="Please check all that you have completed.">
        <div className="sm:col-span-2 flex flex-col gap-2.5">
          {DISCIPLESHIP_JOURNEY_STEPS.map((step) => (
            <CheckboxOption
              key={step}
              name="discipleshipJourneyCompleted"
              value={step}
              defaultChecked={completedSteps.includes(step)}
            >
              {step}
            </CheckboxOption>
          ))}
        </div>
        <Field label="Graduate of Leadership 113?" className="sm:col-span-2">
          <select
            name="graduateOfLeadership113"
            defaultValue={leader.graduateOfLeadership113 == null ? "" : String(leader.graduateOfLeadership113)}
            className={selectCls}
          >
            <option value="">— Select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
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
