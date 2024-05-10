/**
 * Prefer running this script before the blog crawler!
 * https://chromiumdash.appspot.com/serving-builds?deviceCategory=Chrome%20OS
 * objective of scraping chromiumdash (or cros-recovery images, this is just a renewed version):
 * collect "secret" or unannounced builds of Chrome OS
 * post-AUE devices provide earlier builds that may have been unannounced
 * for example, running crawlBlog will miss the non-scrubbed v92 platform version: 13982.88.0
 */

import { isValidBuild, parseRecoveryURL } from "../lib/index.js";
import type { cros_brand, cros_build, cros_target } from "../lib/index.js";
import {
  insertManyTargets,
  insertManyBrands,
  insertManyBuilds,
  channelNameToId,
} from "./dbOp.js";
import fetch from "node-fetch";

const targets: cros_target[] = [];
const builds: cros_build[] = [];
const brands: cros_brand[] = [];

// we use the fetch endpoint... Google has hidden the recovery urls!
const res = await fetch(
  "https://chromiumdash.appspot.com/cros/fetch_serving_builds?deviceCategory=Chrome%20OS",
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
  data: FetchedModel | FetchedModels,
): data is FetchedModels => "models" in data;

for (const board in json.builds) {
  const boardData = json.builds[board];

  let mp_key_max = 1; // start at 1
  let mp_token = "mp";

  const readPushRecovery = (image: string) => {
    // can't scrape the build because we only get the major chrome version number
    // but we can extract mp token and mp key max
    const parsed = parseRecoveryURL(image);
    if (mp_key_max < parsed.mp_key) mp_key_max = parsed.mp_key;
    mp_token = parsed.mp_token;
  };

  const readServings = (model: FetchedModel) => {
    for (const brand of model.brandNames) brands.push({ board, brand });

    for (const key in model) {
      const n = Number(key);
      if (
        isNaN(n) ||
        typeof model[key] !== "object" ||
        model[key] === null ||
        !("chromeVersion" in model[key])
      )
        continue;
      const release = model[key] as {
        chromeVersion: string;
        comparedToMostCommon: number;
        version: string;
      };

      const build = {
        chrome: release.chromeVersion,
        channel: "stable-channel",
        platform: release.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);

      // some builds don't even get a recovery image...
      if (key in model.pushRecoveries) {
        // there's already a recovery image in the pushRecoveries array
        // and google is lying to us, release.version is the wrong platform version...
        const working_img = parseRecoveryURL(model.pushRecoveries[key]);

        if (build.platform !== working_img.platform) {
          // console.warn("PLATFORM WAS DIFFERENT IN PUSH RECOVERY IMG");
          const recoBuild = {
            chrome: release.chromeVersion,
            channel: channelNameToId(working_img.channel),
            platform: working_img.platform,
          };

          if (!isValidBuild(recoBuild))
            throw new Error(`Invalid build: ${JSON.stringify(recoBuild)}`);

          builds.push(recoBuild);
        }
      }
    }

    for (const push in model.pushRecoveries)
      readPushRecovery(model.pushRecoveries[push]);

    if (model.servingStable) {
      const build = {
        chrome: model.servingStable.chromeVersion,
        channel: "stable-channel",
        platform: model.servingStable.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);
    }

    if (model.servingBeta) {
      const build = {
        chrome: model.servingBeta.chromeVersion,
        channel: "beta-channel",
        platform: model.servingBeta.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);
    }

    if (model.servingDev) {
      const build = {
        chrome: model.servingDev.chromeVersion,
        channel: "dev-channel",
        platform: model.servingDev.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);
    }

    if (model.servingLtc) {
      const build = {
        chrome: model.servingLtc.chromeVersion,
        channel: "ltc-channel",
        platform: model.servingLtc.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);
    }

    if (model.servingLtr) {
      // LTS
      const build = {
        chrome: model.servingLtr.chromeVersion,
        channel: "lts-channel",
        platform: model.servingLtr.version,
      };

      if (!isValidBuild(build))
        throw new Error(`Invalid build: ${JSON.stringify(build)}`);

      builds.push(build);
    }
  };

  if (dataContainsModels(boardData))
    for (const model in boardData.models) {
      const modelData = boardData.models[model];
      readServings(modelData);
    }
  else {
    readServings(boardData);
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
