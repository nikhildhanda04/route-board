import {
  pgTable, pgEnum, uuid, text, boolean, integer, doublePrecision,
  timestamp, date, time, jsonb, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum       = pgEnum("role", ["admin", "driver", "attendant"]);
export const routeKindEnum  = pgEnum("route_kind", ["pickup", "drop"]);
export const tripStatusEnum = pgEnum("trip_status", ["scheduled", "running", "done", "cancelled"]);
export const eventKindEnum  = pgEnum("event_kind", ["boarded", "alighted", "absent", "unaccounted"]);
export const outboxEnum     = pgEnum("outbox_status", ["queued", "sent", "failed", "skipped"]);

/**
 * Every tenant-owned table carries school_id, even when it could be reached by
 * a join. One identical RLS policy per table beats six different join-based
 * ones, and the planner never has to walk a chain to prove a row is visible.
 */
const schoolId = () =>
  uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" });

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  waPhoneNumberId: text("wa_phone_number_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  role: roleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phoneE164: text("phone_e164"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_email_uq").on(t.email),
  uniqueIndex("users_phone_uq").on(t.phoneE164),
  index("users_school_idx").on(t.schoolId),
]);

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  name: text("name").notNull(),
  classSection: text("class_section"),
  photoUrl: text("photo_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("students_school_idx").on(t.schoolId)]);

export const guardians = pgTable("guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phoneE164: text("phone_e164").notNull(),
  isPrimary: boolean("is_primary").notNull().default(true),
  optedOut: boolean("opted_out").notNull().default(false),
}, (t) => [index("guardians_student_idx").on(t.studentId)]);

export const buses = pgTable("buses", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  plate: text("plate").notNull(),
  capacity: integer("capacity").notNull().default(40),
}, (t) => [index("buses_school_idx").on(t.schoolId)]);

export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  name: text("name").notNull(),
  kind: routeKindEnum("kind").notNull(),
}, (t) => [index("routes_school_idx").on(t.schoolId)]);

export const stops = pgTable("stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  seq: integer("seq").notNull(),
  scheduledTime: time("scheduled_time"),
}, (t) => [uniqueIndex("stops_route_seq_uq").on(t.routeId, t.seq)]);

export const routeStudents = pgTable("route_students", {
  schoolId: schoolId(),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  stopId: uuid("stop_id").notNull().references(() => stops.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.routeId, t.studentId] }),
  index("route_students_stop_idx").on(t.stopId),
]);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "restrict" }),
  busId: uuid("bus_id").references(() => buses.id, { onDelete: "set null" }),
  driverId: uuid("driver_id").references(() => users.id, { onDelete: "set null" }),
  serviceDate: date("service_date").notNull(),
  status: tripStatusEnum("status").notNull().default("scheduled"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("trips_route_date_uq").on(t.routeId, t.serviceDate),
  index("trips_driver_date_idx").on(t.driverId, t.serviceDate),
]);

/**
 * Append-only. Attendance, parent queries and principal reports are all reads
 * over this table — there is no separate attendance table to drift from it.
 *
 * clientEventId is stamped by the driver PWA before the network is involved,
 * so replaying the offline queue can never double-record (and so never
 * double-message a parent).
 */
export const tripEvents = pgTable("trip_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  stopId: uuid("stop_id").references(() => stops.id, { onDelete: "set null" }),
  kind: eventKindEnum("kind").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
  clientEventId: uuid("client_event_id").notNull(),
}, (t) => [
  uniqueIndex("trip_events_client_uq").on(t.clientEventId),
  index("trip_events_trip_idx").on(t.tripId),
  index("trip_events_student_idx").on(t.studentId),
]);

export const busLocations = pgTable("bus_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  speed: doublePrecision("speed"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("bus_locations_trip_time_idx").on(t.tripId, t.recordedAt)]);

/**
 * Durable outbox. The driver may be offline when a tap happens and a direct
 * send has no retry, so events queue here and a cron drains them. Doubles as
 * the delivery log you point at when a parent says they got nothing.
 */
export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: schoolId(),
  guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  tripEventId: uuid("trip_event_id").references(() => tripEvents.id, { onDelete: "set null" }),
  template: text("template").notNull(),
  params: jsonb("params").notNull().$type<string[]>(),
  status: outboxEnum("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => [index("outbox_pending_idx").on(t.status, t.createdAt)]);
