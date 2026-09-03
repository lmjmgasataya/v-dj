"use client";

import { useState, useTransition } from "react";
import { updateVGLeader } from "./actions";
import { Field, Section, CheckboxOption, RadioOption, inputCls, selectCls, SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { OwnVgLeaderField } from "@/components/OwnVgLeaderField";
import { LeadershipGroupMembersField, type MemberRowValue } from "@/components/LeadershipGroupMembersField";
import type { VictoryGroupLeader } from "@/db/schema";
import { lifestageEnum } from "@/db/schema";

export function EditForm({ leader, leadershipGroupMembers }: { leader: VictoryGroupLeader; leadershipGroupMembers: MemberRowValue[] }) {
  const [pending, startTransition] = useTransition();
  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const [ownVgLeaderLastName, ownVgLeaderFirstName] = (leader.ownVgLeaderName ?? "").split(",").map((s) => s.trim());
  const [isLGL, setIsLGL] = useState(leader.isLeadershipGroupLeader);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => updateVGLeader(leader.id, formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="Personal Information">
        <Field label="Last Name" required>
          <input name="lastName" required defaultValue={leader.lastName} className={inputCls} />
        </Field>
        <Field label="First Name" required>
          <input name="firstName" required defaultValue={leader.firstName} className={inputCls} />
        </Field>
        <Field label="Middle Initial">
          <input name="middleInitial" maxLength={3} defaultValue={leader.middleInitial ?? ""} className={inputCls} placeholder="e.g. A" />
        </Field>
        <Field label="Nickname">
          <input name="nickname" defaultValue={leader.nickname ?? ""} className={inputCls} />
        </Field>
        <Field label="Mobile Number" required>
          <input name="mobileNumber" required defaultValue={leader.mobileNumber ?? ""} className={inputCls} />
        </Field>
        <Field label="Age" required>
          <input name="age" type="number" required min={1} max={120} defaultValue={leader.age ?? ""} className={inputCls} />
        </Field>
        <Field label="Gender" required>
          <select name="gender" required defaultValue={leader.gender ?? ""} className={selectCls}>
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
          <input name="facebookMessengerName" defaultValue={leader.facebookMessengerName ?? ""} className={inputCls} placeholder="e.g. Juan dela Cruz" />
        </Field>
        <OwnVgLeaderField
          excludeId={leader.id}
          defaultLastName={ownVgLeaderLastName}
          defaultFirstName={ownVgLeaderFirstName}
          defaultId={leader.ownVgLeaderId}
        />
      </Section>

      <Section title="Leadership">
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-gray-700 mb-1.5">When did you start leading a Victory Group?</p>
          <div className="flex flex-col gap-2">
            <RadioOption
              name="startedLeadingVg"
              value="before_this_year"
              label="I started leading before this year"
              defaultChecked={leader.startedLeadingVg === "before_this_year"}
            />
            <RadioOption
              name="startedLeadingVg"
              value="this_year"
              label="I started leading this year"
              defaultChecked={leader.startedLeadingVg === "this_year"}
            />
          </div>
        </div>
        <div className="sm:col-span-2 border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700">Are you a Leadership Group Leader?</p>
          <p className="text-xs text-gray-400 mb-1.5">A Leadership Group Leader is leading at least one (1) Victory Group Leader.</p>
          <div className="flex flex-col gap-2">
            <RadioOption name="isLeadershipGroupLeader" value="true" label="Yes" checked={isLGL} onChange={() => setIsLGL(true)} />
            <RadioOption name="isLeadershipGroupLeader" value="false" label="No" checked={!isLGL} onChange={() => setIsLGL(false)} />
          </div>
          {isLGL && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">VG Leaders they lead</p>
              <LeadershipGroupMembersField excludeId={leader.id} defaultMembers={leadershipGroupMembers} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Discipleship Journey" description="Please check all that you have completed.">
        <div className="sm:col-span-2 flex flex-col gap-2.5">
          {DISCIPLESHIP_JOURNEY_STEPS.map((step) => (
            <CheckboxOption key={step} name="discipleshipJourneyCompleted" value={step} defaultChecked={completedSteps.includes(step)}>
              {step}
            </CheckboxOption>
          ))}
        </div>
        <Field label="Graduate of Leadership 113?" className="sm:col-span-2">
          <select name="graduateOfLeadership113" defaultValue={leader.graduateOfLeadership113 == null ? "" : String(leader.graduateOfLeadership113)} className={selectCls}>
            <option value="">— Select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end gap-3">
        <a href="/manage-vg-leaders/leaders" className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </a>
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
