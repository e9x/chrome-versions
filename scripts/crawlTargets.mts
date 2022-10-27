/**
 * Prefer running this script before the blog crawler!
 */
import fetch from "node-fetch";
import { cros_target, parseRecoveryURL } from "../lib/index.js";
import { chromeDBPath } from "../lib/db.js";
import Database from "better-sqlite3";

const db = new Database(chromeDBPath);

// we use the fetch endpoint... Google has hidden the recovery urls!
const res = await fetch(
  "https://chromiumdash.appspot.com/cros/fetch_serving_builds?deviceCategory=Chrome%20OS"
);

if (!res.ok) throw new Error("Fetching CSV was not OK.");

interface FetchedBuild {
  chromeVersion: string;
  comparedToMostCommon: number;
  version: string;
}

interface FetchedModel {
  [releasePinned: number]: FetchedBuild;
  brandNames: string[];
  isAue: boolean;
  pushRecoveries: Record<string, string>;
  servingBeta?: FetchedBuild;
  servingCanary?: FetchedBuild;
  servingDev?: FetchedBuild;
  servingLtc?: FetchedBuild;
  servingLtr?: FetchedBuild;
  servingStable?: FetchedBuild;
}

interface FetchedModels {
  models: Record<string, FetchedModel>;
}

interface FetchedData {
  builds: Record<string, FetchedModel | FetchedModels>;
  creationDate: string;
  creationTime: string;
  enterprisePins: number[];
}

const json = (await res.json()) as FetchedData;

const targets: cros_target[] = [];

const dataContainsModels = (
  data: FetchedModel | FetchedModels
): data is FetchedModels => "models" in data;

for (const board in json.builds) {
  const boardData = json.builds[board];

  let mp_key_max = 1; // start at 1
  let mp_token = "mp";

  const readPushRecovery = (image: string) => {
    try {
      const parsed = parseRecoveryURL(image);
      if (mp_key_max < parsed.mp_key) mp_key_max = parsed.mp_key;
      mp_token = parsed.mp_token;
    } catch (err) {
      console.error("Failure on", board, image);
      console.error(err);
    }
  };

  if (dataContainsModels(boardData))
    for (const model in boardData.models)
      for (const push in boardData.models[model].pushRecoveries)
        readPushRecovery(boardData.models[model].pushRecoveries[push]);
  else
    for (const push in boardData.pushRecoveries) {
      readPushRecovery(boardData.pushRecoveries[push]);
    }

  targets.push({
    board,
    mp_token,
    mp_key_max,
  });
}

const insert = db.prepare<
  [
    board: cros_target["board"],
    mp_tokne: cros_target["mp_token"],
    mp_key_max: cros_target["mp_key_max"]
  ]
>(
  "INSERT OR IGNORE INTO cros_target (board, mp_token, mp_key_max) VALUES (?, ?, ?);"
);

console.log("Found", targets.length, "targets");

const insertMany = db.transaction((targets: cros_target[]) => {
  for (const target of targets)
    insert.run(target.board, target.mp_token, target.mp_key_max);
});

insertMany(targets);
