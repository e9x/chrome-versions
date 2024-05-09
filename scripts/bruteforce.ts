import { chromeDBPath } from "../lib/db.js";
import type {
  cros_build,
  cros_target,
  cros_recovery_image,
  cros_recovery_image_db,
} from "../lib/index";
import { parseChromeVersion, getRecoveryURL } from "../lib/index.js";
import { insertManyRecoveryImage } from "./dbOp.js";
import Database from "better-sqlite3";
import type { Response } from "node-fetch";
import fetch, { AbortError } from "node-fetch";
import { Agent } from "node:https";
import os from "node:os";
import { lookup } from "node:dns/promises";

process.env.UV_THREADPOOL_SIZE = os.cpus().length.toString();

const db = new Database(chromeDBPath);

function logData(data: SomeData) {
  console.log(getRecoveryURL(data[1]));
  console.log(`# BUILD - Chrome v${data[2].chrome}`);
  console.log(`# IMAGE - Patched ${data[0].toISOString()}`);
}

let initReq = 0;
let realReq = 0;

const testMP = db.prepare(
  "SELECT COUNT(*) FROM cros_recovery_image WHERE board = ? AND platform = ? AND chrome = ? AND mp_token = ? AND mp_key = ? AND channel = ?;",
);

async function executeMP(
  target: cros_target,
  build: cros_build,
  mp_key: number,
  agent: Agent,
  signal?: AbortSignal,
): Promise<Executed> {
  const image: cros_recovery_image = {
    board: target.board,
    platform: build.platform,
    mp_key,
    mp_token: target.mp_token,
    channel: build.channel,
    chrome: build.chrome,
  };

  // board, platform, chrome, mp_token, mp_key, channel
  const { "COUNT(*)": count } = testMP.get(
    image.board,
    image.platform,
    image.chrome,
    image.mp_token,
    image.mp_key,
    image.channel,
  ) as { "COUNT(*)": number };

  if (count) throw new Error("Already fetched");

  const url = getRecoveryURL(image, true);
  let res: Response;

  initReq++;

  while (true) {
    try {
      realReq++;
      res = await fetch(url, { method: "HEAD", agent, signal });
      break;
    } catch (err) {
      if (err instanceof AbortError) throw err;
      console.error(err);
      console.log("retrying");
      await sleep(100);
    }
  }

  if (res.status === 404) throw new Error(`${url} : Not Found`);
  else if (!res.ok) {
    console.error(res.status, res.statusText, image);
    throw new Error(`Unknown error: ${res.status}`);
  }

  return {
    image,
    lastModified: new Date(res.headers.get("last-modified") || ""),
  };
}

type SomeData = [
  lastModified: Date,
  image: cros_recovery_image,
  build: cros_build,
];

const getTarget = db.prepare(
  "SELECT * FROM cros_target WHERE board = ? LIMIT 1;",
);

interface Executed {
  image: cros_recovery_image;
  lastModified: Date;
}

function range(start: number, end: number) {
  const range: number[] = [];
  for (let i = start; i < end + 1; i++) range.push(i);
  return range;
}

const dlgooglecom = await lookup("dl.google.com", 4);

const bruteforce = async (board: string) => {
  const agent = new Agent({
    maxSockets: 1000,
    keepAlive: true,
    lookup: (hostname, options, cb) => {
      // @ts-ignore
      cb(null, [dlgooglecom]);
    },
  });

  console.log("Builds may seem to be out of order, this is expected.");

  const target = getTarget.get(board) as cros_target;

  if (!target) throw new Error(`Cannot find target ${board}`);

  const stableBuilds = (
    db
      .prepare<[]>(
        "SELECT * FROM cros_build WHERE channel = 'stable-channel' ORDER BY platform ASC;",
      )
      .all() as cros_build[]
  ).filter((build) => parseChromeVersion(build.chrome)[0] >= 20);

  console.log("Found", stableBuilds.length, "builds...");

  // highest (4) -> lowest (1)
  let lastMpKey = target.mp_key_max;

  const recoveryImages: cros_recovery_image_db[] = [];

  const onData = (build: cros_build, data: Executed) => {
    lastMpKey = data.image.mp_key;

    recoveryImages.push({
      ...data.image,
      last_modified: data.lastModified.toISOString(),
    });

    logData([data.lastModified, data.image, build]);
  };

  const p: Promise<void>[] = [];

  for (const build of stableBuilds)
    p.push(
      executeMP(target, build, lastMpKey, agent)
        .then((data) => onData(build, data))
        .catch(async () => {
          const p: Promise<void>[] = [];

          const keys: number[] = range(1, target.mp_key_max);
          keys.splice(keys.indexOf(lastMpKey), 1);

          const abort = new AbortController();

          for (const mp_key of keys)
            p.push(
              executeMP(target, build, mp_key, agent)
                .then((data) => {
                  abort.abort();

                  onData(build, data);
                })
                .catch(() => {
                  /*console.error(
                    "Couldn't find",
                    target,
                    build.chrome,
                    build.platform,
                    err.message
                  );*/
                }),
            );

          await Promise.all(p);
        }),
    );

  await Promise.all(p);

  console.log("Found", recoveryImages.length, "images");
  console.log("Fetched images. Inserting...");

  insertManyRecoveryImage(recoveryImages);

  console.log("Requests:", { initReq, realReq });
};

const getTargets = db.prepare("SELECT * FROM cros_target;");

const [, , board] = process.argv;

if (board) {
  await bruteforce(board);
} else {
  console.warn("Bruteforcing every board...");

  const targets = getTargets.all() as cros_target[];

  for (const target of targets) {
    console.log("Bruteforcing", target.board);
    await bruteforce(target.board);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
