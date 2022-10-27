/**
 * Prefer running this script before the blog crawler!
 */
import fetch from "node-fetch";
import iterateCSVRows from "./parseCSV.mjs";
import { chromeDBPath } from "../lib/db.js";
import type { cros_build, cros_channel } from "../lib/index";
import Database from "better-sqlite3";

const db = new Database(chromeDBPath);

// https://chromiumdash.appspot.com/serving-builds?deviceCategory=Chrome%20OS
// objective of scraping chromiumdash (or cros-recovery images, this is just a renewed version):
// collect "secret" or unannounced builds of Chrome OS
// post-AUE devices provide earlier builds that may have been unannounced
// for example, running crawlBlog will miss the non-scrubbed v92 platform version: 13982.88.0

// CSV:
// - https://chromiumdash.appspot.com/cros/download_serving_builds_csv?deviceCategory=Chrome%20OS

const res = await fetch(
  "https://chromiumdash.appspot.com/cros/download_serving_builds_csv?deviceCategory=Chrome%20OS"
);

if (!res.ok || !res.body) throw new Error("Fetching CSV was not OK.");

/**
 * Platform key
 */
const versions: Record<string, [id: string, chrome: string]> = {};

for await (const row of iterateCSVRows(res.body))
  for (const column in row) {
    if (column.startsWith("cr_")) {
      const id = column.slice(3);
      const platform = row[`cros_${id}`];
      const chrome = row[column];

      if (!platform) throw new Error(`${column} has no platform`);

      if (platform === "no update") continue;

      versions[platform] = [id, chrome];
    }
  }

const insert = db.prepare<
  [
    platform: cros_build["platform"],
    chrome: cros_build["chrome"],
    channel: cros_build["channel"]
  ]
>(
  "INSERT OR IGNORE INTO cros_build (platform, chrome, channel) VALUES (?, ?, ?);"
);

const builds: cros_build[] = [];

platforms: for (const platform in versions) {
  let channel: cros_channel;

  switch (versions[platform][0]) {
    case "dev":
      channel = "dev-channel";
    case "beta":
      channel = "beta-channel";
    case "canary":
      // we overlook canary builds, they're out of scope
      continue platforms;
    default:
      channel = "stable-channel";
      break;
  }

  builds.push({
    channel,
    chrome: versions[platform][1],
    platform,
  });
}

console.log("Found", builds.length, "builds");

const insertMany = db.transaction((builds: cros_build[]) => {
  for (const build of builds)
    insert.run(build.platform, build.chrome, build.channel);
});

insertMany(builds);
