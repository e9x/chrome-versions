import { chromeDBPath } from "../lib/db.js";
import type {
  cros_brand,
  cros_build,
  cros_recovery_image_db,
  cros_target,
} from "../lib/index.js";
import Database from "better-sqlite3";

export const db = new Database(chromeDBPath);

export const insertBuild = db.prepare<
  [
    platform: cros_build["platform"],
    chrome: cros_build["chrome"],
    channel: cros_build["channel"],
  ]
>(
  "INSERT OR IGNORE INTO cros_build (platform, chrome, channel) VALUES (?, ?, ?);",
);

export const insertManyBuilds = db.transaction((builds: cros_build[]) => {
  for (const build of builds)
    insertBuild.run(build.platform, build.chrome, build.channel);
});

export const insertTarget = db.prepare<
  [
    board: cros_target["board"],
    mp_token: cros_target["mp_token"],
    mp_key_max: cros_target["mp_key_max"],
  ]
>(
  "INSERT OR IGNORE INTO cros_target (board, mp_token, mp_key_max) VALUES (?, ?, ?);",
);

export const insertManyTargets = db.transaction((targets: cros_target[]) => {
  for (const target of targets)
    insertTarget.run(target.board, target.mp_token, target.mp_key_max);
});

export const insertBrand = db.prepare<
  [board: cros_brand["board"], brand: cros_brand["brand"]]
>("INSERT OR IGNORE INTO cros_brand (board, brand) VALUES (?, ?);");

export const insertManyBrands = db.transaction((brands: cros_brand[]) => {
  for (const brand of brands) insertBrand.run(brand.board, brand.brand);
});

export const insertRecoveryImage = db.prepare<
  [
    board: cros_recovery_image_db["board"],
    platform: cros_recovery_image_db["platform"],
    chrome: cros_recovery_image_db["chrome"],
    mp_token: cros_recovery_image_db["mp_token"],
    mp_key: cros_recovery_image_db["mp_key"],
    channel: cros_recovery_image_db["channel"],
    last_modified: cros_recovery_image_db["last_modified"],
  ]
>(
  "INSERT OR IGNORE INTO cros_recovery_image (board, platform, chrome, mp_token, mp_key, channel, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?);",
);

export const insertManyRecoveryImage = db.transaction(
  (images: cros_recovery_image_db[]) => {
    for (const image of images)
      insertRecoveryImage.run(
        image.board,
        image.platform,
        image.chrome,
        image.mp_token,
        image.mp_key,
        image.channel,
        image.last_modified,
      );
  },
);
