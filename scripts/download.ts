import { chromeDBPath } from "../lib/db.js";
import { mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname } from "node:path";
import { finished } from "node:stream/promises";
import fetch from "node-fetch";

const apiUrl = `https://api.github.com/repos/e9x/chrome-versions/releases/latest`;

const res = await fetch(apiUrl);

if (!res.ok) throw new Error(`github api returned ${res.status}`);

const data = (await res.json()) as {
  name: string;
  body: string;
  created_at: string;
  assets: {
    name: string;
    state: string;
    size: number;
    browser_download_url: string;
  }[];
};

const asset = data.assets.find((e) => e.name === "chrome.db");

if (!asset) throw new Error("Could not find chrome.db in latest release");

if (asset.state !== "uploaded")
  throw new Error('chrome.db state was not "uploaded", try again later');

console.log(
  "Found release",
  data.name,
  "from",
  data.created_at,
  "with db",
  asset.size,
  "bytes",
);

console.log("Release notes:");
console.log(data.body);

const dbRes = await fetch(asset.browser_download_url);

if (!dbRes.ok) throw new Error(`chrome.db returned ${dbRes.status}`);

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

await finished(dbRes.body!.pipe(createWriteStream(chromeDBPath)));

console.log("Wrote chrome.db");
