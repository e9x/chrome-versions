import { chromeDBPath } from "../lib/db.js";
import Database from "better-sqlite3";
import { mkdir, rm, readFile } from "node:fs/promises";
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

const cmds = await readFile(new URL("../db.sql", import.meta.url), "utf-8")

db.exec(cmds);

console.log("Database initialized.");
