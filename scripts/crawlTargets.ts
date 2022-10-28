/**
 * Prefer running this script before the blog crawler!
 */

import { chromeDBPath } from "../lib/db.js";
import { cros_brand, cros_target, parseRecoveryURL } from "../lib/index.js";
import Database from "better-sqlite3";
import fetch from "node-fetch";

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

const brands: cros_brand[] = [];

const addBrands = (brandNames: string[], board: string) => {
  for (const brand of brandNames) brands.push({ board, brand });
};

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
    for (const model in boardData.models) {
      const modelData = boardData.models[model];
      addBrands(modelData.brandNames, board);
      for (const push in modelData.pushRecoveries)
        readPushRecovery(modelData.pushRecoveries[push]);
    }
  else {
    addBrands(boardData.brandNames, board);
    for (const push in boardData.pushRecoveries) {
      readPushRecovery(boardData.pushRecoveries[push]);
    }
  }

  targets.push({
    board,
    mp_token,
    mp_key_max,
  });
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

console.log("Found", targets.length, "targets");

db.transaction(() => {
  for (const target of targets)
    insertTarget.run(target.board, target.mp_token, target.mp_key_max);
})();

const insertBrand = db.prepare<
  [board: cros_brand["board"], brand: cros_brand["brand"]]
>("INSERT OR IGNORE INTO cros_brand (board, brand) VALUES (?, ?);");

console.log("Found", brands.length, "targets");

db.transaction(() => {
  for (const brand of brands) insertBrand.run(brand.board, brand.brand);
})();
