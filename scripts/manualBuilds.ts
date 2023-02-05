import { chromeDBPath } from "../lib/db.js";
import type { cros_build } from "../lib/index.js";
import Database from "better-sqlite3";

const db = new Database(chromeDBPath);

const builds: cros_build[] = [
  {
    // https://github.com/e9x/chrome100/issues/9
    channel: "stable-channel",
    chrome: "87.0.4280.109",
    platform: "13505.73.0",
  },
];

const insert = db.prepare<
  [
    platform: cros_build["platform"],
    chrome: cros_build["chrome"],
    channel: cros_build["channel"]
  ]
>(
  "INSERT OR IGNORE INTO cros_build (platform, chrome, channel) VALUES (?, ?, ?);"
);

console.log("Found", builds.length, "builds");

const insertMany = db.transaction((builds: cros_build[]) => {
  for (const build of builds)
    insert.run(build.platform, build.chrome, build.channel);
});

insertMany(builds);
