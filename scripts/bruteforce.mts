import fetch from "node-fetch";
import { chromeDBPath, getRecoveryURL } from "../lib/index.js";
import type {
  cros_build,
  cros_target,
  cros_recovery_image,
} from "../lib/index";
import Database from "better-sqlite3";

const db = new Database(chromeDBPath);

const stableBuilds = db
  .prepare<[]>(
    "SELECT * FROM cros_build WHERE channel = 'stable-channel' ORDER BY platform ASC;"
  )
  .all() as cros_build[];

console.log(`Found ${stableBuilds.length} builds...`);

function strategyExecute<T extends unknown>(
  times: number,
  execute: (i: number) => Promise<T>
): AsyncGenerator<PromiseSettledResult<Awaited<T>>>;

function strategyExecute<T extends unknown, Data extends unknown>(
  times: Data[],
  execute: (data: Data) => Promise<T>
): AsyncGenerator<PromiseSettledResult<Awaited<T>>>;

async function* strategyExecute<T extends unknown, Data extends unknown>(
  times: number | Data[],
  execute: (i: number | Data) => Promise<T>
) {
  const sets: (() => Promise<T>)[][] = [];

  if (typeof times === "number")
    for (let i = 0; i < times; i++) {
      const executeI = Math.floor(i / 10);

      if (sets.length < executeI + 1) sets.push([]);

      const set = sets[executeI];

      set.push(() => execute(i));
    }
  else
    for (let i = 0; i < times.length; i++) {
      const executeI = Math.floor(i / 10);

      if (sets.length < executeI + 1) sets.push([]);

      const set = sets[executeI];

      set.push(() => execute(times[i]));
    }

  for (const set of sets)
    for (const res of await Promise.allSettled(set.map((s) => s()))) yield res;
}

interface Executed {
  image: cros_recovery_image;
  lastModified: Date;
}

async function executeMP(
  target: cros_target,
  build: cros_build,
  mp_key: number
): Promise<Executed> {
  const image = {
    board: target.board,
    platform: build.platform,
    mp_key,
    mp_token: target.mp_token,
    channel: build.channel,
  } as cros_recovery_image;

  const url = getRecoveryURL(image, false);
  const res = await fetch(url, { method: "HEAD" });

  if (res.status === 404) throw new Error("Not Found");
  else if (!res.ok) {
    console.error(res.status, res.statusText, image);
    throw new Error(`Unknown error: ${res.status}`);
  }

  return {
    image,
    lastModified: new Date(res.headers.get("last-modified") || ""),
  };
}

// highest (4) -> lowest (1)
/*const target: cros_target = {
  board: "reks",
  mpMax: 4,
};*/

const getTarget = db.prepare(
  "SELECT * FROM cros_target WHERE board = 'reks' LIMIT 1;"
);

const target = getTarget.get();

let lastMpKey = target.mp_key_max;

type SomeData = [
  lastModified: Date,
  image: cros_recovery_image,
  build: cros_build
];

let datas: SomeData[] = [];

for (const build of stableBuilds) {
  let gotData: Executed | undefined;

  try {
    gotData = await executeMP(target, build, lastMpKey);
  } catch (err) {
    const keys: number[] = [];

    for (let i = 0; i < target.mp_key_max; i++) keys.push(i + 1);

    keys.splice(keys.indexOf(lastMpKey), 1);

    for await (const data of strategyExecute(keys, (mp_key) => {
      return executeMP(target, build, mp_key);
    })) {
      if (data.status === "rejected") continue;
      gotData = data.value;
      break;
    }
  }

  if (!gotData) {
    // console.error("Couldn't find", build.chrome, build.platform);
    continue;
  }

  lastMpKey = gotData.image.mp_key;

  logData([gotData.lastModified, gotData.image, build]);
}

function logData(data: SomeData) {
  console.log(getRecoveryURL(data[1]));
  console.log(`# BUILD - Chrome v${data[2].chrome}`);
  console.log(`# IMAGE - Patched ${data[0].toISOString()}`);
}

for (const data of datas.sort((a, b) => a[0].getTime() - b[0].getTime()))
  logData(data);
