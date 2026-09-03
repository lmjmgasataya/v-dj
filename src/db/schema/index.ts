import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  serial,
  text,
  boolean,
  timestamp,
  date,
  integer,
  unique,
  uniqueIndex,
  index,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const lifestageEnum = pgEnum("lifestage", [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const vgFrequencyEnum = pgEnum("vg_frequency", [
  "Weekly",
  "Every other week",
  "Once a month",
  "Others",
]);

export const checkInStatusEnum = pgEnum("check_in_status", ["On-time", "Late", "Absent"]);

export const checkInMethodEnum = pgEnum("check_in_method", ["Search", "Webcam", "QR Reader", "Walk-in"]);

export const registeredModeEnum = pgEnum("registered_mode", [
  "participant_registration",
  "vgl_portal_registration",
  "vgl_edit_registration",
]);

export const startedLeadingVgEnum = pgEnum("started_leading_vg", ["before_this_year", "this_year"]);

export const groupTypeEnum = pgEnum("group_type", ["victory_group", "leadership_group"]);

export const victoryGroupLeaders = pgTable("victory_group_leaders", {
  id: serial("id").primaryKey(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  middleInitial: text("middle_initial"),
  nickname: text("nickname"),
  mobileNumber: text("mobile_number"),
  age: integer("age"),
  gender: text("gender"),
  lifestage: lifestageEnum("lifestage"),
  serviceAttending: text("service_attending"),
  facebookMessengerName: text("facebook_messenger_name"),
  discipleshipJourneyCompleted: text("discipleship_journey_completed"),
  graduateOfLeadership113: boolean("graduate_of_leadership_113"),
  ownVgLeaderName: text("own_vg_leader_name"),
  ownVgLeaderId: integer("own_vg_leader_id").references((): AnyPgColumn => victoryGroupLeaders.id),
  startedLeadingVg: startedLeadingVgEnum("started_leading_vg"),
  isLeadershipGroupLeader: boolean("is_leadership_group_leader").default(false).notNull(),
  profileCompleted: boolean("profile_completed").default(false).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  registeredMode: registeredModeEnum("registered_mode").default("participant_registration").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [unique().on(t.lastName, t.firstName, t.mobileNumber)]);

export const leadershipGroupMembers = pgTable("leadership_group_members", {
  id: serial("id").primaryKey(),
  leaderId: integer("leader_id").references(() => victoryGroupLeaders.id).notNull(),
  memberVgLeaderId: integer("member_vg_leader_id").references(() => victoryGroupLeaders.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.leaderId, t.memberVgLeaderId)]);

export const victoryGroups = pgTable("victory_groups", {
  id: serial("id").primaryKey(),
  vgLeaderId: integer("vg_leader_id")
    .references(() => victoryGroupLeaders.id)
    .notNull(),
  place: text("place").notNull(),
  day: dayOfWeekEnum("day").notNull(),
  time: text("time").notNull(),
  frequency: vgFrequencyEnum("frequency").notNull(),
  otherFrequency: text("other_frequency"),
  lifeStage: lifestageEnum("life_stage").array(),
  isActive: boolean("is_active").default(true).notNull(),
  remarks: text("remarks"),
  type: groupTypeEnum("type").default("victory_group").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const interns = pgTable("interns", {
  id: serial("id").primaryKey(),
  victoryGroupId: integer("victory_group_id").references(() => victoryGroups.id).notNull(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  classStartDate: date("class_start_date").notNull(),
  classEndDate: date("class_end_date").notNull(),
  registrationStartDate: date("registration_start_date"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  middleInitial: text("middle_initial"),
  mobileNumber: text("mobile_number"),
  facebookMessengerName: text("facebook_messenger_name"),
  lifestage: lifestageEnum("lifestage"),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  serviceAttending: text("service_attending").notNull(),
  completedOne2One: boolean("completed_one2one"),
  willUndergoWaterBaptism: boolean("will_undergo_water_baptism"),
  previousChurch: text("previous_church"),
  preferredNameOnId: text("preferred_name_on_id"),
  disciplerId: integer("discipler_id").references(() => victoryGroupLeaders.id),
  vgLeaderId: integer("vg_leader_id").references(() => victoryGroupLeaders.id),
  confirmedReadiness: boolean("confirmed_readiness"),
  acknowledgementReceiptNumber: text("acknowledgement_receipt_number"),
  registrationFee: text("registration_fee"),
  adminVolunteerName: text("admin_volunteer_name"),
  isDoneWithVictoryWeekend: boolean("is_done_with_victory_weekend"),
  isWalkIn: boolean("is_walk_in").default(false).notNull(),
  victoryDate: text("victory_date"),
  email: text("email"),
  school: text("school"),
  worshipServiceRegistered: text("worship_service_registered"),
  batchId: integer("batch_id").references(() => batches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("participants_report_idx").on(t.deletedAt, t.isWalkIn, t.createdAt),
  index("participants_batch_id_idx").on(t.batchId),
]);

export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionDate: date("session_date").notNull(),
  isVictoryDay: boolean("is_victory_day").default(false).notNull(),
  requiresVictoryDay: boolean("requires_victory_day").default(true).notNull(),
  allowsWalkIn: boolean("allows_walk_in").default(false).notNull(),
  batchId: integer("batch_id").references(() => batches.id),
}, (t) => [
  index("class_sessions_session_date_idx").on(t.sessionDate),
  index("class_sessions_batch_id_idx").on(t.batchId),
]);

export const checkIns = pgTable(
  "check_ins",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .references(() => participants.id)
      .notNull(),
    classSessionId: integer("class_session_id")
      .references(() => classSessions.id)
      .notNull(),
    checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
    remarks: text("remarks"),
    tableNumber: integer("table_number"),
    status: checkInStatusEnum("status").notNull().default("On-time"),
    method: checkInMethodEnum("method").notNull().default("Search"),
  },
  (t) => [
    unique().on(t.participantId, t.classSessionId),
    index("check_ins_class_session_id_idx").on(t.classSessionId),
    index("check_ins_checked_in_at_idx").on(t.checkedInAt),
  ]
);

export const eventAudienceEnum = pgEnum("event_audience", ["vg_leader", "intern"]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  isDone: boolean("is_done").default(false).notNull(),
  audience: eventAudienceEnum("audience").array().notNull(),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const eventCheckIns = pgTable(
  "event_check_ins",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .references(() => events.id)
      .notNull(),
    attendeeType: eventAudienceEnum("attendee_type").notNull(),
    vgLeaderId: integer("vg_leader_id").references(() => victoryGroupLeaders.id),
    internId: integer("intern_id").references(() => interns.id),
    attendeeName: text("attendee_name").notNull(),
    checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("event_check_ins_event_leader_idx")
      .on(t.eventId, t.vgLeaderId)
      .where(sql`${t.vgLeaderId} is not null`),
    uniqueIndex("event_check_ins_event_intern_idx")
      .on(t.eventId, t.internId)
      .where(sql`${t.internId} is not null`),
    index("event_check_ins_event_id_idx").on(t.eventId),
  ]
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").references(() => events.id).notNull(),
    vgLeaderId: integer("vg_leader_id").references(() => victoryGroupLeaders.id).notNull(),
    willAttend: boolean("will_attend").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.eventId, t.vgLeaderId)]
);

export const eventRegistrationInterns = pgTable(
  "event_registration_interns",
  {
    id: serial("id").primaryKey(),
    eventRegistrationId: integer("event_registration_id").references(() => eventRegistrations.id).notNull(),
    internId: integer("intern_id").references(() => interns.id).notNull(),
  },
  (t) => [unique().on(t.eventRegistrationId, t.internId)]
);

// Interns register themselves for events, independent of their VG leader's own registration.
export const internEventRegistrations = pgTable(
  "intern_event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").references(() => events.id).notNull(),
    internId: integer("intern_id").references(() => interns.id).notNull(),
    willAttend: boolean("will_attend").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.eventId, t.internId)]
);

export const roleEnum = pgEnum("user_role", ["admin_volunteer", "developer", "vg_leader", "lead_pastor"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("admin_volunteer"),
  vgLeaderId: integer("vg_leader_id").references(() => victoryGroupLeaders.id),
  pinHash: text("pin_hash"),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.vgLeaderId)]);

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  userId: integer("user_id").references(() => users.id),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsMessageTemplates = pgTable("sms_message_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsApiKeys = pgTable("sms_api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull(),
  endpoint: text("endpoint"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vgReportSnapshots = pgTable("vg_report_snapshots", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  asOfDate: date("as_of_date").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.label)]);

export const vgConvergenceAttendance = pgTable("vg_convergence_attendance", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  eventDate: date("event_date").notNull(),
  attendees: integer("attendees").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadership113Batches = pgTable("leadership_113_batches", {
  id: serial("id").primaryKey(),
  batchName: text("batch_name").notNull(),
  actual: integer("actual").notNull(),
  goal: integer("goal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  recipientName: text("recipient_name").notNull(),
  recipientNumber: text("recipient_number").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(),
  participantId: integer("participant_id").references(() => participants.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type CheckInStatus = (typeof checkInStatusEnum.enumValues)[number];
export type CheckInMethod = (typeof checkInMethodEnum.enumValues)[number];
export type User = typeof users.$inferSelect;
export type LoginLog = typeof loginLogs.$inferSelect;
export type VictoryGroupLeader = typeof victoryGroupLeaders.$inferSelect;
export type VictoryGroup = typeof victoryGroups.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type SmsMessageTemplate = typeof smsMessageTemplates.$inferSelect;
export type SmsApiKey = typeof smsApiKeys.$inferSelect;
export type SmsLog = typeof smsLogs.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type VgReportSnapshot = typeof vgReportSnapshots.$inferSelect;
export type VgConvergenceAttendance = typeof vgConvergenceAttendance.$inferSelect;
export type Leadership113Batch = typeof leadership113Batches.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventCheckIn = typeof eventCheckIns.$inferSelect;
export type Intern = typeof interns.$inferSelect;
export type LeadershipGroupMember = typeof leadershipGroupMembers.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type EventRegistrationIntern = typeof eventRegistrationInterns.$inferSelect;
export type InternEventRegistration = typeof internEventRegistrations.$inferSelect;
