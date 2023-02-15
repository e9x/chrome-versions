/**
 * Prefer running this script before the blog crawler!
 * https://chromiumdash.appspot.com/serving-builds?deviceCategory=Chrome%20OS
 * objective of scraping chromiumdash (or cros-recovery images, this is just a renewed version):
 * collect "secret" or unannounced builds of Chrome OS
 * post-AUE devices provide earlier builds that may have been unannounced
 * for example, running crawlBlog will miss the non-scrubbed v92 platform version: 13982.88.0
 */

import { parseRecoveryURL } from "../lib/index.js";
import type { cros_brand, cros_build, cros_target } from "../lib/index.js";
import {
  insertManyTargets,
  insertManyBrands,
  insertManyBuilds,
} from "./dbOp.js";
import fetch from "node-fetch";

const targets: cros_target[] = [];
const builds: cros_build[] = [];
const brands: cros_brand[] = [];

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

const dataContainsModels = (
  data: FetchedModel | FetchedModels
): data is FetchedModels => "models" in data;

const addBrands = (brandNames: string[], board: string) => {
  for (const brand of brandNames) brands.push({ board, brand });
};

for (const board in json.builds) {
  const boardData = json.builds[board];

  let mp_key_max = 1; // start at 1
  let mp_token = "mp";

  const readPushRecovery = (image: string) => {
    const parsed = parseRecoveryURL(image);

    // collect the build
    builds.push({
      chrome: parsed.chrome,
      channel: parsed.channel,
      platform: parsed.platform,
    });

    // for the target
    if (mp_key_max < parsed.mp_key) mp_key_max = parsed.mp_key;
    mp_token = parsed.mp_token;
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

console.log("Found", targets.length, "targets");
console.log("Found", brands.length, "brands");
console.log("Found", builds.length, "builds");

insertManyTargets(targets);
insertManyBrands(brands);
insertManyBuilds(builds);
