import { stripHtml } from "string-strip-html";
import fetch from "node-fetch";
import type { BloggerPostList } from "./Blogger";
import { chromeDBPath, isValidBuild } from "../lib/index.js";
import type { cros_build, cros_channel } from "../lib/index";
import Database from "better-sqlite3";
import { createInterface } from "node:readline";

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

const lines = createInterface(res.body);

let keys: string[];

let index = 0;

type csvRow = Record<string, string>;

/**
 * Platform key
 */
const versions: Record<string, [id: string, chrome: string]> = {};

lines.on("line", (line) => {
  const i = index++;

  const values = line.split(",").filter((x) => x);

  if (i === 0) {
    keys = values;
    return;
  }

  if (values.length !== keys.length) throw new Error(`Bad row ${i}`);

  const object: csvRow = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    object[key] = values[i];
  }

  const pairs: [cr: string, cros?: string][] = [];

  for (const key in object) {
    if (key.startsWith("cr_")) {
      const id = key.slice(3);
      const platform = object[`cros_${id}`];
      const chrome = object[key];

      if (!platform) throw new Error(`${key} has no platform`);

      if (platform === "no update") continue;

      versions[platform] = [id, chrome];
    }
  }
});

await new Promise<void>((resolve) => {
  lines.on("close", () => resolve());
});

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

const insertMany = db.transaction((builds: cros_build[]) => {
  for (const build of builds)
    insert.run(build.platform, build.chrome, build.channel);
});

insertMany(builds);
