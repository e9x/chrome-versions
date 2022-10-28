import { chromeDBPath } from "../lib/db.js";
import type {
  cros_build,
  cros_target,
  cros_recovery_image,
  cros_recovery_image_db,
} from "../lib/index";
import { getRecoveryURL } from "../lib/index.js";
import Database from "better-sqlite3";
import fetch from "node-fetch";
import { Agent } from "node:http";

const db = new Database(chromeDBPath);

const insert = db.prepare<
  [
    board: cros_recovery_image_db["board"],
    platform: cros_recovery_image_db["platform"],
    chrome: cros_recovery_image_db["chrome"],
    mp_token: cros_recovery_image_db["mp_token"],
    mp_key: cros_recovery_image_db["mp_key"],
    channel: cros_recovery_image_db["channel"],
    last_modified: cros_recovery_image_db["last_modified"]
  ]
>(
  "INSERT OR IGNORE INTO cros_recovery_image (board, platform, chrome, mp_token, mp_key, channel, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?);"
);

const insertMany = db.transaction((images: cros_recovery_image_db[]) => {
  for (const image of images)
    insert.run(
      image.board,
      image.platform,
      image.chrome,
      image.mp_token,
      image.mp_key,
      image.channel,
      image.last_modified
    );
});

const bruteforce = async (board: string) => {
  console.log("Builds may seem to be out of order, this is expected.");

  const getTarget = db.prepare(
    "SELECT * FROM cros_target WHERE board = ? LIMIT 1;"
  );

  const target = getTarget.get(board);

  if (!target) throw new Error(`Cannot find target ${board}`);

  // Recovery images exist for M55+
  function someM55(build: cros_build) {
    const [major] = build.chrome.split(".");
    return Number(major) >= 55;
  }

  const stableBuilds = (
    db
      .prepare<[]>(
        "SELECT * FROM cros_build WHERE channel = 'stable-channel' ORDER BY platform ASC;"
      )
      .all() as cros_build[]
  ).filter(someM55);

  console.log(`Found ${stableBuilds.length} builds...`);

  function strategyExecute<T>(
    times: number,
    execute: (i: number) => Promise<T>
  ): AsyncGenerator<PromiseSettledResult<Awaited<T>>>;

  function strategyExecute<T, Data>(
    times: Data[],
    execute: (data: Data) => Promise<T>
  ): AsyncGenerator<PromiseSettledResult<Awaited<T>>>;

  async function* strategyExecute<T, Data>(
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
      for (const res of await Promise.allSettled(set.map((s) => s())))
        yield res;
  }

  interface Executed {
    image: cros_recovery_image;
    lastModified: Date;
  }

  const agent = new Agent({
    maxSockets: 10,
    keepAlive: true,
  });

  async function executeMP(
    target: cros_target,
    build: cros_build,
    mp_key: number
  ): Promise<Executed> {
    const image: cros_recovery_image = {
      board: target.board,
      platform: build.platform,
      mp_key,
      mp_token: target.mp_token,
      channel: build.channel,
      chrome: build.chrome,
    };

    const url = getRecoveryURL(image, false);
    const res = await fetch(url, { method: "HEAD", agent });

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
  let lastMpKey = target.mp_key_max;

  type SomeData = [
    lastModified: Date,
    image: cros_recovery_image,
    build: cros_build
  ];

  const recoveryImages: cros_recovery_image_db[] = [];

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

    if (!gotData) continue;
    // console.error("Couldn't find", build.chrome, build.platform);

    // success

    lastMpKey = gotData.image.mp_key;

    recoveryImages.push({
      ...gotData.image,
      last_modified: gotData.lastModified.toISOString(),
    });

    logData([gotData.lastModified, gotData.image, build]);
  }

  function logData(data: SomeData) {
    console.log(getRecoveryURL(data[1]));
    console.log(`# BUILD - Chrome v${data[2].chrome}`);
    console.log(`# IMAGE - Patched ${data[0].toISOString()}`);
  }

  console.log("Fetched images. Inserting...");

  insertMany(recoveryImages);
};

export default bruteforce;
