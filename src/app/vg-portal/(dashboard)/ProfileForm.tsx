"use client";

import { useRef, useState, useTransition } from "react";
import { updateOwnProfile } from "./actions";
import { Field, Section, CheckboxOption, RadioOption, inputCls, selectCls, SERVICE_OPTIONS, DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { OwnVgLeaderField } from "@/components/OwnVgLeaderField";
import { LeadershipGroupMembersField, type MemberRowValue } from "@/components/LeadershipGroupMembersField";
import { MyVictoryGroups } from "./MyVictoryGroups";
import type { VictoryGroupLeader, VictoryGroup } from "@/db/schema";
import { lifestageEnum } from "@/db/schema";
import { computeProfileProgress } from "@/lib/profileCompleteness";

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

export function ProfileForm({
  leader,
  hasActiveGroup,
  leadershipGroupMembers,
  groups,
  internsByGroup,
}: {
  leader: VictoryGroupLeader;
  hasActiveGroup: boolean;
  leadershipGroupMembers: MemberRowValue[];
  groups: VictoryGroup[];
  internsByGroup: Record<number, { lastName: string; firstName: string }[]>;
}) {
  const [pending, startTransition] = useTransition();
  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const { percent, missing } = computeProfileProgress(leader, hasActiveGroup);
  const [ownVgLeaderLastName, ownVgLeaderFirstName] = (leader.ownVgLeaderName ?? "").split(",").map((s) => s.trim());
  const [isLGL, setIsLGL] = useState(leader.isLeadershipGroupLeader);

  const [step, setStep] = useState<"form" | "review">("form");
  const [captured, setCaptured] = useState<Record<string, string | string[]>>({});
  const formRef = useRef<HTMLFormElement>(null);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);

    if (isLGL) {
      const hasMember = Array.from(fd.keys()).some(
        (k) => /^lgl_\d+_lastName$/.test(k) && ((fd.get(k) as string) || "").trim()
      );
      if (!hasMember) {
        alert("Please add at least one VG Leader you lead.");
        return;
      }
    }

    if (fd.getAll("discipleshipJourneyCompleted").length === 0) {
      alert("Please select at least one completed step in the Discipleship Journey.");
      return;
    }

    if (groups.length === 0) {
      alert("Please add at least one Victory Group or Leadership Group before continuing.");
      return;
    }

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
    startTransition(async () => {
      await updateOwnProfile(fd);
    });
  }

  const cSteps = Array.isArray(captured.discipleshipJourneyCompleted)
    ? captured.discipleshipJourneyCompleted
    : captured.discipleshipJourneyCompleted
      ? [captured.discipleshipJourneyCompleted]
      : [];

  return (
    <div className="flex flex-col gap-6">
      {step === "form" && (
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
      )}

      {/* ---- FORM (always mounted; hidden while reviewing so values are preserved) ---- */}
      <div className={`flex flex-col gap-6 ${step === "review" ? "hidden" : ""}`}>
        <form ref={formRef} id="profile-form" onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <Section title="My Information" description="Your last name is on file with an admin — contact one to change it.">
            <Field label="Last Name">
              <p className="text-sm text-gray-700 py-2">{leader.lastName}</p>
            </Field>
            <Field label="First Name" required>
              <input name="firstName" required defaultValue={leader.firstName} className={inputCls} />
            </Field>
            <Field label="Nickname" required>
              <input name="nickname" required defaultValue={leader.nickname ?? ""} className={inputCls} />
            </Field>
            <Field label="Mobile Number" required>
              <input name="mobileNumber" required defaultValue={leader.mobileNumber ?? ""} className={inputCls} />
            </Field>
            <Field label="Age" required>
              <input name="age" type="number" required min={1} max={120} defaultValue={leader.age ?? ""} className={inputCls} />
            </Field>
            <Field label="Gender" required>
              <select name="gender" required defaultValue={leader.gender ?? ""} className={selectCls}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="Lifestage" required>
              <select name="lifestage" required defaultValue={leader.lifestage ?? ""} className={selectCls}>
                <option value="">— Select —</option>
                {lifestageEnum.enumValues.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Service Attending" required>
              <select name="serviceAttending" required defaultValue={leader.serviceAttending ?? ""} className={selectCls}>
                <option value="">— Select —</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Facebook / Messenger Name" className="sm:col-span-2" required>
              <input
                name="facebookMessengerName"
                required
                defaultValue={leader.facebookMessengerName ?? ""}
                className={inputCls}
                placeholder="e.g. Juan dela Cruz"
              />
            </Field>
            <OwnVgLeaderField
              excludeId={leader.id}
              defaultLastName={ownVgLeaderLastName}
              defaultFirstName={ownVgLeaderFirstName}
              defaultId={leader.ownVgLeaderId}
              required
            />
            <div className="sm:col-span-2 mt-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <CheckboxOption name="isActive" defaultChecked={leader.isActive} align="start" labelClassName="font-semibold text-amber-900">
                I am actively leading a Victory Group
              </CheckboxOption>
              <p className="text-xs text-amber-700 mt-1 ml-[26px]">
                This determines whether your profile counts as complete — leave it checked only if you&apos;re currently leading.
              </p>
            </div>
          </Section>

          <Section title="Leadership">
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-1.5">When did you start leading a Victory Group? <span className="text-red-500">*</span></p>
              <div className="flex flex-col gap-2">
                <RadioOption
                  name="startedLeadingVg"
                  value="before_this_year"
                  label="I started leading before this year"
                  required
                  defaultChecked={leader.startedLeadingVg === "before_this_year"}
                />
                <RadioOption
                  name="startedLeadingVg"
                  value="this_year"
                  label="I started leading this year"
                  required
                  defaultChecked={leader.startedLeadingVg === "this_year"}
                />
              </div>
            </div>
            <div className="sm:col-span-2 border-t border-gray-100 pt-3">
              <p className="text-sm font-medium text-gray-700">Are you a Leadership Group Leader? <span className="text-red-500">*</span></p>
              <p className="text-xs text-gray-400 mb-1.5">A Leadership Group Leader is leading at least one (1) Victory Group Leader.</p>
              <div className="flex flex-col gap-2">
                <RadioOption
                  name="isLeadershipGroupLeader"
                  value="true"
                  label="Yes"
                  checked={isLGL}
                  onChange={() => setIsLGL(true)}
                />
                <RadioOption
                  name="isLeadershipGroupLeader"
                  value="false"
                  label="No"
                  checked={!isLGL}
                  onChange={() => setIsLGL(false)}
                />
              </div>
              {isLGL && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    VG Leaders you lead <span className="text-red-500">*</span>
                  </p>
                  <LeadershipGroupMembersField excludeId={leader.id} defaultMembers={leadershipGroupMembers} />
                </div>
              )}
            </div>
          </Section>

          <Section title="Discipleship Journey" description="Please check all that you have completed.">
            <div className="sm:col-span-2 flex flex-col gap-2.5">
              <p className="text-sm font-medium text-gray-700 -mb-1">
                Steps Completed <span className="text-red-500">*</span>
              </p>
              {DISCIPLESHIP_JOURNEY_STEPS.map((journeyStep) => (
                <CheckboxOption
                  key={journeyStep}
                  name="discipleshipJourneyCompleted"
                  value={journeyStep}
                  defaultChecked={completedSteps.includes(journeyStep)}
                >
                  {journeyStep}
                </CheckboxOption>
              ))}
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                Graduate of Leadership 113? <span className="text-red-500">*</span>
              </p>
              <div className="flex flex-col gap-2">
                <RadioOption
                  name="graduateOfLeadership113"
                  value="true"
                  label="Yes"
                  required
                  defaultChecked={leader.graduateOfLeadership113 === true}
                />
                <RadioOption
                  name="graduateOfLeadership113"
                  value="false"
                  label="No"
                  required
                  defaultChecked={leader.graduateOfLeadership113 === false}
                />
              </div>
            </div>
          </Section>
        </form>

        <MyVictoryGroups groups={groups} internsByGroup={internsByGroup} isLeadershipGroupLeader={isLGL} />

        <div className="flex justify-end">
          <button
            type="submit"
            form="profile-form"
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            Review Changes
          </button>
        </div>
      </div>

      {/* ---- REVIEW ---- */}
      {step === "review" && (
        <div className="flex flex-col gap-6">
          <ReviewSection title="My Information">
            <ReviewRow label="Last Name" value={leader.lastName} />
            <ReviewRow label="First Name" value={captured.firstName as string} />
            <ReviewRow label="Nickname" value={captured.nickname as string} />
            <ReviewRow label="Mobile Number" value={captured.mobileNumber as string} />
            <ReviewRow label="Age" value={captured.age as string} />
            <ReviewRow label="Gender" value={captured.gender as string} />
            <ReviewRow label="Lifestage" value={captured.lifestage as string} />
            <ReviewRow label="Service Attending" value={captured.serviceAttending as string} />
            <ReviewRow label="Facebook / Messenger Name" value={captured.facebookMessengerName as string} span />
            <ReviewRow
              label="Name of your Victory Group Leader"
              value={[captured.ownVgLeaderLastName, captured.ownVgLeaderFirstName].filter(Boolean).join(", ") || null}
              span
            />
            <ReviewRow
              label="Actively Leading a Victory Group"
              value={captured.isActive === "on" ? "Yes" : "No"}
              span
            />
          </ReviewSection>

          <ReviewSection title="Leadership">
            <ReviewRow
              label="When did you start leading a Victory Group?"
              value={
                captured.startedLeadingVg === "before_this_year"
                  ? "Before this year"
                  : captured.startedLeadingVg === "this_year"
                    ? "This year"
                    : null
              }
              span
            />
            <ReviewRow
              label="Leadership Group Leader?"
              value={captured.isLeadershipGroupLeader === "true" ? "Yes" : "No"}
              span
            />
            {captured.isLeadershipGroupLeader === "true" && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">VG Leaders you lead</dt>
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
      )}
    </div>
  );
}
