import { db } from "./index";
import { classSessions } from "./schema";

const sessions = [
  { name: "Spiritual Foundations Day 1 (Morning) - Victory Day", sessionDate: "2026-07-25", isVictoryDay: true },
  { name: "Spiritual Foundations Day 1 (Afternoon) - Victory Day", sessionDate: "2026-07-25", isVictoryDay: true },
  { name: "Spiritual Foundations Day 2", sessionDate: "2026-08-01", isVictoryDay: false },
  { name: "Spiritual Foundations Day 3", sessionDate: "2026-08-08", isVictoryDay: false },
  { name: "Spiritual Foundations Day 4", sessionDate: "2026-08-15", isVictoryDay: false },
  { name: "Spiritual Foundations Day 5", sessionDate: "2026-08-22", isVictoryDay: false },
  { name: "Spiritual Foundations Day 6", sessionDate: "2026-08-29", isVictoryDay: false },
  { name: "Spiritual Foundations Day 7", sessionDate: "2026-09-05", isVictoryDay: false },
  { name: "Spiritual Foundations Day 8", sessionDate: "2026-09-12", isVictoryDay: false },
  { name: "Spiritual Foundations Day 9", sessionDate: "2026-09-19", isVictoryDay: false },
  { name: "Spiritual Foundations Day 10", sessionDate: "2026-09-26", isVictoryDay: false },
  { name: "Making Disciples Day 1", sessionDate: "2026-10-03", isVictoryDay: false },
  { name: "Making Disciples Day 2", sessionDate: "2026-10-10", isVictoryDay: false },
];

async function seed() {
  console.log("Seeding class sessions...");
  await db.insert(classSessions).values(sessions).onConflictDoNothing();
  console.log(`Inserted ${sessions.length} class sessions.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
