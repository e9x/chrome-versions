import { chromeDBPath } from "../lib/db.js";
import { getRecoveryURL } from "../lib/index.js";
import type { cros_recovery_image_db, cros_target } from "../lib/index.js";
import Database from "better-sqlite3";
import bytes from "bytes";
import CacheableLookup from "cacheable-lookup";
import type { Response } from "node-fetch";
import fetch from "node-fetch";
import { Agent } from "node:https";
import os from "node:os";

process.env.UV_THREADPOOL_SIZE = os.cpus().length.toString();

const db = new Database(chromeDBPath);

const getTarget = db.prepare(
  "SELECT * FROM cros_target WHERE board = ? LIMIT 1;"
);
const getTargets = db.prepare("SELECT * FROM cros_target;");
const getImages = db.prepare<[board: string]>(
  "SELECT * FROM cros_recovery_image WHERE board = ?;"
);

const [, , board] = process.argv;

if (board) {
  await calculateSize(board);
} else {
  console.warn("Calculating for every board...");

  const targets = getTargets.all() as cros_target[];

  let size = 0;

  await Promise.all(
    targets.map((target) =>
      calculateSize(target.board).then((bs) => (size += bs))
    )
  );

  console.log(`calculated size for everything: ${bytes(size)} (${size} bytes)`);
}

async function fetchImage(image: cros_recovery_image_db, agent: Agent) {
  const url = getRecoveryURL(image, true);
  let res: Response;

  while (true) {
    try {
      res = await fetch(url, { method: "HEAD", agent });
      break;
    } catch (err) {
      console.error(err);
      console.log("retrying");
    }
  }

  if (res.status === 404) throw new Error(`${url} : Not Found`);
  else if (!res.ok) {
    console.error(res.status, res.statusText, image);
    throw new Error(`Unknown error: ${res.status}`);
  }

  const size = Number(res.headers.get("content-length"));

  if (isNaN(size)) throw new RangeError("got NaN");

  const filename = new URL(url).pathname.split("/").slice(-1)[0];

  console.log(`${filename} calculated size: ${bytes(size)} (${size} bytes)`);

  return size;
}

async function calculateSize(boardName: string) {
  const cache = new CacheableLookup();

  const agent = new Agent({
    maxSockets: 1000,
    keepAlive: true,
  });

  cache.install(agent);

  const board = getTarget.get(boardName) as cros_target;

  if (!board) throw new TypeError(`Unknown board '${boardName}'`);

  console.log(`Calculate for ${board.board}`);

  const images = getImages.all(board.board) as cros_recovery_image_db[];

  console.log("Found", images.length, "images");

  let size = 0;

  await Promise.all(
    images.map((image) =>
      fetchImage(image, agent).then((data) => (size += data))
    )
  );

  console.log(`${board.board} calculated size: ${bytes(size)} (${size} bytes)`);

  return size;
}
