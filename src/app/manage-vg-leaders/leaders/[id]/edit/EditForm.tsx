"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateVGLeader } from "./actions";
import { Field, Section, CheckboxOption, RadioOption, inputCls, selectCls, SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { OwnVgLeaderField } from "@/components/OwnVgLeaderField";
import { LeadershipGroupMembersField, type MemberRowValue } from "@/components/LeadershipGroupMembersField";
import { VictoryGroupsSection } from "./VictoryGroupsSection";
import type { VictoryGroupLeader, VictoryGroup } from "@/db/schema";
import { lifestageEnum } from "@/db/schema";

type InternRow = { lastName: string; firstName: string };

function ReviewRow({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h3>
      </div>
      <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</dl>
    </div>
  );
}

export function EditForm({
  leader,
  leadershipGroupMembers,
  groups,
  internsByGroup,
}: {
  leader: VictoryGroupLeader;
  leadershipGroupMembers: MemberRowValue[];
  groups: VictoryGroup[];
  internsByGroup: Record<number, InternRow[]>;
}) {
  const [pending, startTransition] = useTransition();
  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const [ownVgLeaderLastName, ownVgLeaderFirstName] = (leader.ownVgLeaderName ?? "").split(",").map((s) => s.trim());
  const [isLGL, setIsLGL] = useState(leader.isLeadershipGroupLeader);
  const [step, setStep] = useState<"form" | "review">("form");
  const [captured, setCaptured] = useState<Record<string, string | string[]>>({});

  function handleReviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | string[]> = {};
    for (const key of new Set(fd.keys())) {
      const values = fd.getAll(key) as string[];
      data[key] = values.length > 1 ? values : values[0];
    }
    setCaptured(data);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleConfirm() {
    const fd = new FormData();
    Object.entries(captured).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
      else fd.append(k, v);
    });
    startTransition(() => updateVGLeader(leader.id, fd));
  }

  const cSteps = Array.isArray(captured.discipleshipJourneyCompleted)
    ? captured.discipleshipJourneyCompleted
    : captured.discipleshipJourneyCompleted
      ? [captured.discipleshipJourneyCompleted]
      : [];

  if (step === "review") {
    return (
      <div className="flex flex-col gap-6">
        <ReviewSection title="Personal Information">
          <ReviewRow label="Last Name" value={captured.lastName as string} />
          <ReviewRow label="First Name" value={captured.firstName as string} />
          <ReviewRow label="Middle Initial" value={captured.middleInitial as string} />
          <ReviewRow label="Nickname" value={captured.nickname as string} />
          <ReviewRow label="Mobile Number" value={captured.mobileNumber as string} />
          <ReviewRow label="Age" value={captured.age as string} />
          <ReviewRow label="Gender" value={captured.gender as string} />
          <ReviewRow label="Lifestage" value={captured.lifestage as string} />
          <ReviewRow label="Service Attending" value={captured.serviceAttending as string} />
          <ReviewRow label="Facebook / Messenger Name" value={captured.facebookMessengerName as string} span />
          <ReviewRow
            label="Name of their Victory Group Leader"
            value={[captured.ownVgLeaderLastName, captured.ownVgLeaderFirstName].filter(Boolean).join(", ") || null}
            span
          />
        </ReviewSection>

        <ReviewSection title="Leadership">
          <ReviewRow
            label="When did they start leading a Victory Group?"
            value={
              captured.startedLeadingVg === "before_this_year"
                ? "Before this year"
                : captured.startedLeadingVg === "this_year"
                  ? "This year"
                  : null
            }
            span
          />
          <ReviewRow label="Leadership Group Leader?" value={captured.isLeadershipGroupLeader === "true" ? "Yes" : "No"} span />
          {captured.isLeadershipGroupLeader === "true" && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">VG Leaders they lead</dt>
              <dd className="text-sm text-gray-900">
                {(() => {
                  const names = Object.keys(captured)
                    .filter((k) => /^lgl_\d+_lastName$/.test(k))
                    .map((k) => {
                      const i = k.match(/^lgl_(\d+)_lastName$/)![1];
                      const last = captured[`lgl_${i}_lastName`];
                      const first = captured[`lgl_${i}_firstName`];
                      return [last, first].filter(Boolean).join(", ");
                    })
                    .filter(Boolean);
                  return names.length ? (
                    <ul className="list-disc list-inside space-y-0.5">
                      {names.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  );
                })()}
              </dd>
            </div>
          )}
        </ReviewSection>

        <ReviewSection title="Discipleship Journey">
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Steps Completed</dt>
            <dd className="text-sm text-gray-900">
              {cSteps.length ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {cSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <ReviewRow
            label="Graduate of Leadership 113?"
            value={captured.graduateOfLeadership113 === "" || captured.graduateOfLeadership113 == null ? null : captured.graduateOfLeadership113 === "true" ? "Yes" : "No"}
            span
          />
        </ReviewSection>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {pending ? "Saving..." : "Confirm & Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form id="vg-leader-edit-form" onSubmit={handleReviewSubmit} className="flex flex-col gap-6">
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
          <Field label="Nickname" required>
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
          <Field label="Lifestage" required>
            <select name="lifestage" defaultValue={leader.lifestage ?? ""} className={selectCls}>
              <option value="">— Select —</option>
              {lifestageEnum.enumValues.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Service Attending" required>
            <select name="serviceAttending" defaultValue={leader.serviceAttending ?? ""} className={selectCls}>
              <option value="">— Select —</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Facebook / Messenger Name" className="sm:col-span-2" required>
            <input name="facebookMessengerName" defaultValue={leader.facebookMessengerName ?? ""} className={inputCls} placeholder="e.g. Juan dela Cruz" />
          </Field>
          <OwnVgLeaderField
            excludeId={leader.id}
            defaultLastName={ownVgLeaderLastName}
            defaultFirstName={ownVgLeaderFirstName}
            defaultId={leader.ownVgLeaderId}
            required
          />
        </Section>

        <Section title="Leadership">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-1.5">When did they start leading a Victory Group? <span className="text-red-500">*</span></p>
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
            <p className="text-sm font-medium text-gray-700">
              Are you a Leadership Group Leader? <span className="text-red-500">*</span>
            </p>
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

        <Section title="Discipleship Journey" description="Please check all that they have completed.">
          <div className="sm:col-span-2 flex flex-col gap-2.5">
            <p className="text-sm font-medium text-gray-700 -mb-1">
              Steps Completed <span className="text-red-500">*</span>
            </p>
            {DISCIPLESHIP_JOURNEY_STEPS.map((journeyStep) => (
              <CheckboxOption key={journeyStep} name="discipleshipJourneyCompleted" value={journeyStep} defaultChecked={completedSteps.includes(journeyStep)}>
                {journeyStep}
              </CheckboxOption>
            ))}
          </div>
          <Field label="Graduate of Leadership 113?" className="sm:col-span-2" required>
            <select name="graduateOfLeadership113" defaultValue={leader.graduateOfLeadership113 == null ? "" : String(leader.graduateOfLeadership113)} className={selectCls}>
              <option value="">— Select —</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </Section>
      </form>

      <VictoryGroupsSection
        groups={groups}
        internsByGroup={internsByGroup}
        vgLeaderId={leader.id}
        isLeadershipGroupLeader={leader.isLeadershipGroupLeader}
      />

      <div className="flex justify-end gap-3">
        <Link href="/manage-vg-leaders/leaders" className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </Link>
        <button
          type="submit"
          form="vg-leader-edit-form"
          className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          Review Changes
        </button>
      </div>
    </div>
  );
}
