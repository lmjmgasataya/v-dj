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
  disciplerLastName: text("discipler_last_name"),
  disciplerFirstName: text("discipler_first_name"),
  disciplerMobileNumber: text("discipler_mobile_number"),
  disciplerMessengerName: text("discipler_messenger_name"),
  confirmedReadiness: boolean("confirmed_readiness"),
  acknowledgementReceiptNumber: text("acknowledgement_receipt_number"),
  registrationFee: text("registration_fee"),
  adminVolunteerName: text("admin_volunteer_name"),
  isWalkIn: boolean("is_walk_in").default(false).notNull(),
  vgLeaderLastName: text("vg_leader_last_name"),
  vgLeaderFirstName: text("vg_leader_first_name"),
  victoryDate: text("victory_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionDate: date("session_date").notNull(),
  isVictoryDay: boolean("is_victory_day").default(false).notNull(),
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

export type Participant = typeof participants.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type Discipler = typeof disciplers.$inferSelect;
export type User = typeof users.$inferSelect;
