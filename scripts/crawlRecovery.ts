import type { cros_brand, cros_build, cros_target } from "../lib/index";
import { parseRecoveryURL } from "../lib/index.js";
import {
  insertManyBrands,
  insertManyBuilds,
  insertManyTargets,
} from "./dbOp.js";
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
  chrome_version?: string;
  hwids: string[];
}

const recoveryTargets: RecoveryTarget[] = [];

for (const jsonURL of [
  "https://dl.google.com/dl/edgedl/chromeos/recovery/recovery.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/recovery2.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/onhub_recovery.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/workspaceHardware_recovery2.json",
  "https://dl.google.com/dl/edgedl/chromeos/recovery/cloudready_recovery.json",
]) {
  const res = await fetch(jsonURL);
  if (!res.ok || !res.body) throw new Error("Failure");
  recoveryTargets.push(...((await res.json()) as RecoveryTarget[]));
}

const targets: cros_target[] = [];
const brands: cros_brand[] = [];
const builds: cros_build[] = [];

for (const target of recoveryTargets) {
  const parsedImg = parseRecoveryURL(target.url);

  if (target.chrome_version)
    builds.push({
      channel: parsedImg.channel,
      chrome: target.chrome_version,
      platform: parsedImg.platform,
    });

  // assume mp_token is the max bc the json is the latest
  targets.push({
    board: parsedImg.board,
    mp_token: parsedImg.mp_token,
    mp_key_max: parsedImg.mp_key,
  });

  brands.push({ board: parsedImg.board, brand: target.model });
}

console.log("Found", targets.length, "targets");
console.log("Found", brands.length, "brands");
console.log("Found", builds.length, "builds");

insertManyTargets(targets);
insertManyBrands(brands);
insertManyBuilds(builds);
