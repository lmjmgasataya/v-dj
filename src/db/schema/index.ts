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

export const disciplers = pgTable(
  "disciplers",
  {
    id: serial("id").primaryKey(),
    lastName: text("last_name").notNull(),
    firstName: text("first_name").notNull(),
    mobileNumber: text("mobile_number").notNull(),
    messengerName: text("messenger_name"),
  },
  (t) => [unique().on(t.lastName, t.firstName, t.mobileNumber)]
);

export const victoryGroupLeaders = pgTable("victory_group_leaders", {
  id: serial("id").primaryKey(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  middleInitial: text("middle_initial"),
  mobileNumber: text("mobile_number").notNull(),
  age: integer("age"),
  gender: text("gender"),
  lifestage: lifestageEnum("lifestage"),
  serviceAttending: text("service_attending"),
  facebookMessengerName: text("facebook_messenger_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
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
  disciplerId: integer("discipler_id").references(() => disciplers.id),
  vgLeaderId: integer("vg_leader_id").references(() => victoryGroupLeaders.id),
  confirmedReadiness: boolean("confirmed_readiness"),
  acknowledgementReceiptNumber: text("acknowledgement_receipt_number"),
  registrationFee: text("registration_fee"),
  adminVolunteerName: text("admin_volunteer_name"),
  isWalkIn: boolean("is_walk_in").default(false).notNull(),
  victoryDate: text("victory_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionDate: date("session_date").notNull(),
  isVictoryDay: boolean("is_victory_day").default(false).notNull(),
  allowsWalkIn: boolean("allows_walk_in").default(false).notNull(),
});

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
  },
  (t) => [unique().on(t.participantId, t.classSessionId)]
);

export const roleEnum = pgEnum("user_role", ["admin_volunteer", "developer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("admin_volunteer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  userId: integer("user_id").references(() => users.id),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type Discipler = typeof disciplers.$inferSelect;
export type User = typeof users.$inferSelect;
export type LoginLog = typeof loginLogs.$inferSelect;
export type VictoryGroupLeader = typeof victoryGroupLeaders.$inferSelect;
export type VictoryGroup = typeof victoryGroups.$inferSelect;
