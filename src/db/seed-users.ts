import "dotenv/config";
import { db } from ".";
import { users } from "./schema";
import bcrypt from "bcryptjs";

const ACCOUNTS = [
  { username: "admin", name: "Admin Volunteer", role: "admin_volunteer" as const, password: "admin_service_team" },
  { username: "discipleship", name: "Discipleship", role: "developer" as const, password: "discipleship_team" },
  { username: "developer", name: "Developer", role: "developer" as const, password: "developer_team" },
];

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    await db
      .insert(users)
      .values({ username: account.username, passwordHash, name: account.name, role: account.role })
      .onConflictDoUpdate({ target: users.username, set: { passwordHash, name: account.name, role: account.role } });
    console.log(`✓ ${account.username} (${account.role})`);
  }
  console.log("\nDefault password for both accounts: changeme");
  console.log("Change passwords before deploying to production.");
  process.exit(0);
}

main();
