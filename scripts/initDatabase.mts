import Database from "better-sqlite3";
import { chromeDBPath } from "../lib/index.js";
import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";

try {
  await mkdir(dirname(chromeDBPath));
} catch (err) {
  if ((err as NodeJS.ErrnoException)?.code !== "EEXIST") throw err;
}

try {
  await rm(chromeDBPath);
  console.log("Deleted old database.");
} catch (err) {
  if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
}

const db = new Database(chromeDBPath);

db.exec(`CREATE TABLE cros_recovery_image (
  board TEXT NOT NULL,
  platform TEXT NOT NULL,
  mp_key INT NOT NULL,
  channel TEXT NOT NULL CHECK(channel = 'stable-channel' OR channel = 'beta-channel' OR channel = 'dev-channel'),
  UNIQUE(board, platform, mp_key, channel)
);`);

db.exec(`CREATE TABLE cros_build (
  platform TEXT NOT NULL,
  chrome TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel = 'stable-channel' OR channel = 'beta-channel' OR channel = 'dev-channel'),
  UNIQUE(platform, chrome, channel)
);`);

console.log("Database initialized.");
