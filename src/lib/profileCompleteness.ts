export type LeaderProfileFields = {
  nickname: string | null;
  mobileNumber: string | null;
  age: number | null;
  gender: string | null;
  lifestage: string | null;
  serviceAttending: string | null;
  facebookMessengerName: string | null;
  ownVgLeaderName: string | null;
  startedLeadingVg: string | null;
};

const PROFILE_FIELDS: { key: keyof LeaderProfileFields; label: string }[] = [
  { key: "nickname", label: "Nickname" },
  { key: "mobileNumber", label: "Mobile Number" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "lifestage", label: "Lifestage" },
  { key: "serviceAttending", label: "Service Attending" },
  { key: "facebookMessengerName", label: "Facebook / Messenger Name" },
  { key: "ownVgLeaderName", label: "Name of your Victory Group Leader" },
  { key: "startedLeadingVg", label: "When did you start leading a Victory Group?" },
];

function isFieldMissing(leader: LeaderProfileFields, key: keyof LeaderProfileFields): boolean {
  const value = leader[key];
  return key === "age" ? value == null : !value;
}

export function getMissingProfileFields(leader: LeaderProfileFields): string[] {
  return PROFILE_FIELDS.filter(({ key }) => isFieldMissing(leader, key)).map(({ label }) => label);
}

export function computeProfileCompleted(leader: LeaderProfileFields, hasActiveGroup: boolean): boolean {
  return hasActiveGroup && getMissingProfileFields(leader).length === 0;
}

export function computeProfileProgress(leader: LeaderProfileFields, hasActiveGroup: boolean) {
  const missing = getMissingProfileFields(leader);
  const totalSteps = PROFILE_FIELDS.length + 1;
  const completedSteps = PROFILE_FIELDS.length - missing.length + (hasActiveGroup ? 1 : 0);
  const percent = Math.round((completedSteps / totalSteps) * 100);
  return {
    percent,
    missing: hasActiveGroup ? missing : [...missing, "At least 1 Victory Group"],
  };
}
