import {
  participants, victoryGroupLeaders, leadershipGroupMembers, victoryGroups, interns, batches,
  classSessions, checkIns, sessionVglCheckIns, events, eventCheckIns, eventRegistrations,
  internEventRegistrations, users, loginLogs, featureFlags, smsMessageTemplates, smsApiKeys,
  appSettings, vgReportSnapshots, vgConvergenceAttendance, leadership113Batches, smsLogs,
  manualQuarterResponses, autoJourneySteps, l113Batches, l113BatchStudents, l113Teachers, l113Topics, l113Schedules, l113ScheduleDates,
  l113CheckIns, l113SpiritualDisciplines, l113StudentEvaluations, l113TeacherEvaluations,
} from "@/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";

export interface DevopsTable {
  /** ?table= key for /api/devops-admin/export (older keys kept so existing links still work). */
  key: string;
  label: string;
  table: PgTable;
  /** Columns left out of the CSV export — secrets. */
  omit?: string[];
}

/**
 * Every table in the public schema, grouped by the portal that owns it. Drives the Data page
 * (row counts + CSV export), the export route and the Database size list on the Overview.
 * Add a new table here when it's added to the schema.
 */
export const DEVOPS_TABLE_GROUPS: { portal: string; tables: DevopsTable[] }[] = [
  {
    portal: "Discipleship Journey Portal",
    tables: [
      { key: "batches", label: "Batches", table: batches },
      { key: "class_sessions", label: "Class Sessions", table: classSessions },
      { key: "participants", label: "Participants", table: participants },
      { key: "check_ins", label: "Check-ins", table: checkIns },
      { key: "session_vgl_check_ins", label: "VGL-only Session Check-ins", table: sessionVglCheckIns },
      { key: "auto_journey_steps", label: "Automatic Journey Steps", table: autoJourneySteps },
    ],
  },
  {
    portal: "VG Leader Portal",
    tables: [
      { key: "vg_leaders", label: "VG Leaders", table: victoryGroupLeaders },
      { key: "vg_groups", label: "VG Groups", table: victoryGroups },
      { key: "interns", label: "Interns", table: interns },
      { key: "leadership_group_members", label: "Leadership Group Members", table: leadershipGroupMembers },
      { key: "vg_report_snapshots", label: "VG Report Snapshots", table: vgReportSnapshots },
      { key: "vg_convergence_attendance", label: "VG Convergence Attendance", table: vgConvergenceAttendance },
      { key: "manual_quarter_responses", label: "Manual Quarter Responses", table: manualQuarterResponses },
      { key: "leadership_113_batches", label: "Leadership 113 Batches", table: leadership113Batches },
    ],
  },
  {
    portal: "L113 Portal",
    tables: [
      { key: "l113_batches", label: "L113 Batches", table: l113Batches },
      { key: "l113_batch_students", label: "L113 Batch Students", table: l113BatchStudents },
      { key: "l113_teachers", label: "L113 Teachers", table: l113Teachers },
      { key: "l113_topics", label: "L113 Topics", table: l113Topics },
      { key: "l113_schedules", label: "L113 Schedule Topics", table: l113Schedules },
      { key: "l113_schedule_dates", label: "L113 Schedule Dates", table: l113ScheduleDates },
      { key: "l113_check_ins", label: "L113 Check-ins", table: l113CheckIns },
      { key: "l113_spiritual_disciplines", label: "L113 Spiritual Disciplines", table: l113SpiritualDisciplines },
      { key: "l113_student_evaluations", label: "L113 Student Evaluations", table: l113StudentEvaluations },
      { key: "l113_teacher_evaluations", label: "L113 Teacher Evaluations", table: l113TeacherEvaluations },
    ],
  },
  {
    portal: "Event Registration",
    tables: [
      { key: "events", label: "Events", table: events },
      { key: "event_registrations", label: "Event Registrations", table: eventRegistrations },
      { key: "intern_event_registrations", label: "Intern Event Registrations", table: internEventRegistrations },
      { key: "event_check_ins", label: "Event Check-ins", table: eventCheckIns },
    ],
  },
  {
    portal: "SMS",
    tables: [
      { key: "sms_logs", label: "SMS Logs", table: smsLogs },
      { key: "sms_message_templates", label: "SMS Message Templates", table: smsMessageTemplates },
      { key: "sms_api_keys", label: "SMS API Keys (no keys)", table: smsApiKeys, omit: ["apiKey"] },
    ],
  },
  {
    portal: "System",
    tables: [
      { key: "users", label: "Users (no passwords / PINs)", table: users, omit: ["passwordHash", "pinHash"] },
      { key: "login_logs", label: "Login Logs", table: loginLogs },
      { key: "feature_flags", label: "Feature Flags", table: featureFlags },
      { key: "app_settings", label: "App Settings", table: appSettings },
    ],
  },
];

export const DEVOPS_TABLES: DevopsTable[] = DEVOPS_TABLE_GROUPS.flatMap((g) => g.tables);
