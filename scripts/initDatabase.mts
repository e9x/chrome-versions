import { chromeDBPath } from "../lib/db.js";
import Database from "better-sqlite3";
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
  chrome TEXT NOT NULL,
  mp_token TEXT NOT NULL,
  mp_key INT NOT NULL,
  channel TEXT NOT NULL CHECK(channel = 'stable-channel' OR channel = 'beta-channel' OR channel = 'dev-channel'),
  last_modified TEXT NOT NULL,
  UNIQUE(board, platform)
);`);

db.exec(`CREATE TABLE cros_target (
  board TEXT NOT NULL,
  mp_token TEXT NOT NULL,
  mp_key_max INT NOT NULL,
  UNIQUE(board)
);`);

db.exec(`CREATE TABLE cros_brand (
  board TEXT NOT NULL,
  brand TEXT NOT NULL,
  UNIQUE(brand)
);`);

db.exec(`CREATE TABLE cros_build (
  platform TEXT NOT NULL,
  chrome TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel = 'stable-channel' OR channel = 'beta-channel' OR channel = 'dev-channel'),
  UNIQUE(platform)
);`);

console.log("Database initialized.");
