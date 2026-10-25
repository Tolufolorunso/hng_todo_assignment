import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const appsDir = path.join(rootDir, "apps");

const appNames = ["web", "mobile", "windows"];
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "bin",
  "obj",
  ".git",
  "coverage",
]);

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".cs",
]);

let violationsFound = 0;

function walk(currentDir, currentApp) {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walk(path.join(currentDir, entry.name), currentApp);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.has(ext)) {
        checkFile(path.join(currentDir, entry.name), currentApp);
      }
    }
  }
}

function checkFile(filePath, currentApp) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");

  // Other apps that cannot be imported
  const forbiddenApps = appNames.filter((app) => app !== currentApp);

  for (const forbidden of forbiddenApps) {
    // Patterns matching cross-application imports:
    // e.g. import ... from 'apps/mobile'
    // e.g. import ... from '../mobile'
    // e.g. using TaskFlow.Mobile in C#
    const forbiddenPatterns = [
      new RegExp(`(?:from|import|require\\s*\\()\\s*["'][^"']*apps/${forbidden}[^"']*["']`, "g"),
      new RegExp(`(?:from|import|require\\s*\\()\\s*["'][^"']*\\.\\./+${forbidden}[^"']*["']`, "g"),
      new RegExp(`\\busing\\s+TaskFlow\\.${forbidden.charAt(0).toUpperCase() + forbidden.slice(1)}\\b`, "g"),
    ];

    for (const regex of forbiddenPatterns) {
      const match = regex.exec(content);
      if (match) {
        console.error(`Boundary violation in ${relativePath}: illegal cross-app reference to '${forbidden}'`);
        violationsFound++;
      }
    }
  }
}

console.log("Checking application isolation boundaries...");
for (const app of appNames) {
  const appPath = path.join(appsDir, app);
  walk(appPath, app);
}

if (violationsFound > 0) {
  console.error(`Boundary check failed: found ${violationsFound} cross-application import violation(s).`);
  process.exit(1);
} else {
  console.log("Boundary check passed: zero cross-application imports found across apps.");
  process.exit(0);
}
