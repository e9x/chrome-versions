import { chromeDBPath } from "../lib/db.js";
import type { cros_brand, cros_target } from "../lib/index";
import { parseRecoveryURL } from "../lib/index.js";
import Database from "better-sqlite3";
import fetch from "node-fetch";

interface RecoveryTarget {
  channel: string;
  desc: string;
  file: string;
  filesize: number;
  hwidmatch: string;
  manufacturer: string;
  md5: string;
  model: string;
  name: string;
  photourl: string;
  sha1: string;
  sku: string;
  url: string;
  version: string;
  zipfilesize: number;
  chrome_version: string;
  hwids: string[];
}

const db = new Database(chromeDBPath);

const recoveryTargets: RecoveryTarget[] = [];

for (const jsonURL of [
  "https://dl.google.com/dl/edgedl/chromeos/recovery/recovery.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/recovery2.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/cloudready_recovery.json",
]) {
  const res = await fetch(jsonURL);
  if (!res.ok || !res.body) throw new Error("Failure");
  recoveryTargets.push(...((await res.json()) as RecoveryTarget[]));
}

const insertTarget = db.prepare<
  [
    board: cros_target["board"],
    mp_token: cros_target["mp_token"],
    mp_key_max: cros_target["mp_key_max"]
  ]
>(
  "INSERT OR IGNORE INTO cros_target (board, mp_token, mp_key_max) VALUES (?, ?, ?);"
);

const insertBrand = db.prepare<
  [board: cros_brand["board"], brand: cros_brand["brand"]]
>("INSERT OR IGNORE INTO cros_brand (board, brand) VALUES (?, ?);");

for (const target of recoveryTargets) {
  const parsedImg = parseRecoveryURL(target.url);

  // assume mp_token is the max bc the json is the latest
  insertTarget.run(parsedImg.board, parsedImg.mp_token, parsedImg.mp_key);
  insertBrand.run(parsedImg.board, target.model);
}
