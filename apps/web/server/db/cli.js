import { runMigrationsFromCli } from "./migrate.ts";

runMigrationsFromCli().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
