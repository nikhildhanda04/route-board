import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as s from "../db/schema";

const DEMO_PASSWORD = "routeboard-demo";

// Seeding crosses tenant boundaries, so it runs as the owner (RLS-exempt).
const pool = new Pool({ connectionString: process.env.MIGRATE_DATABASE_URL });
const db = drizzle(pool, { schema: s });

const STOPS = [
  ["Jayanagar 4th Block", 12.9304, 77.5834, "07:42:00"],
  ["South End Circle",    12.9352, 77.5806, "07:50:00"],
  ["Madhavan Park",       12.9382, 77.5796, "07:57:00"],
  ["Tilak Nagar",         12.9268, 77.5905, "08:03:00"],
  ["Ragigudda",           12.9178, 77.5939, "08:08:00"],
  ["BTM Layout",          12.9166, 77.6101, "08:12:00"],
] as const;

const STUDENTS = [
  ["Aarav Menon","6B",0], ["Diya Rao","4A",0], ["Kabir Shah","7C",0],
  ["Ishita Nair","5B",1], ["Vihaan Gupta","3A",1],
  ["Ananya Iyer","8A",2], ["Rohan Das","6A",2], ["Meera Pillai","4C",2],
  ["Arjun Reddy","7B",3], ["Saanvi Joshi","5A",3],
  ["Neel Kulkarni","3B",4], ["Tara Bose","8C",4],
  ["Advait Sharma","6C",5], ["Zoya Khan","4B",5],
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const phone = (n: number) => "+9198" + String(45000000 + n * 137).padStart(8, "0");

async function main() {
  // trip_events is append-only (a trigger blocks DELETE, even via cascade),
  // but TRUNCATE never fires row-level triggers — this is the one place in
  // the app that is allowed to wipe history, and only because it runs as the
  // RLS-exempt owner against a disposable dev/demo database.
  await db.execute(sql`truncate table schools, leads restart identity cascade`);

  const [school] = await db.insert(s.schools)
    .values({ name: "Vidya Vihar School", timezone: "Asia/Kolkata" }).returning();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [driver] = await db.insert(s.users).values({
    schoolId: school.id, role: "driver", fullName: "Ramesh Kumar",
    phoneE164: "+919845012345", passwordHash,
  }).returning();

  await db.insert(s.users).values({
    schoolId: school.id, role: "admin", fullName: "Transport Desk",
    email: "transport@vidyavihar.example", passwordHash,
  });

  const [bus] = await db.insert(s.buses)
    .values({ schoolId: school.id, plate: "KA-01-5521", capacity: 40 }).returning();

  const [route] = await db.insert(s.routes)
    .values({ schoolId: school.id, name: "Jayanagar — AM pickup", kind: "pickup" }).returning();

  const stopRows = await db.insert(s.stops).values(
    STOPS.map(([name, lat, lng, t], i) => ({
      schoolId: school.id, routeId: route.id, name, lat, lng, seq: i, scheduledTime: t,
    }))
  ).returning();

  const studentRows = await db.insert(s.students).values(
    STUDENTS.map(([name, classSection]) => ({ schoolId: school.id, name, classSection }))
  ).returning();

  await db.insert(s.guardians).values(
    studentRows.map((st, i) => ({
      schoolId: school.id, studentId: st.id,
      name: st.name.split(" ").slice(-1)[0] + " (parent)",
      phoneE164: phone(i), isPrimary: true,
    }))
  );

  await db.insert(s.routeStudents).values(
    studentRows.map((st, i) => ({
      schoolId: school.id, routeId: route.id, studentId: st.id,
      stopId: stopRows[STUDENTS[i][2]].id,
    }))
  );

  await db.insert(s.trips).values({
    schoolId: school.id, routeId: route.id, busId: bus.id,
    driverId: driver.id, serviceDate: today(), status: "scheduled",
  });

  // A second tenant exists purely so isolation is testable rather than assumed.
  const [other] = await db.insert(s.schools).values({ name: "St. Xavier's High" }).returning();
  await db.insert(s.students).values([
    { schoolId: other.id, name: "Should Not Appear", classSection: "9A" },
    { schoolId: other.id, name: "Also Hidden", classSection: "9B" },
  ]);

  console.log(`seeded:
  ${school.name}  ${school.id}
    ${stopRows.length} stops, ${studentRows.length} students, 1 route, 1 bus, 1 trip (${today()})
  ${other.name}  ${other.id}
    2 students

  login — admin:  transport@vidyavihar.example / ${DEMO_PASSWORD}
  login — driver: +919845012345 / ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
