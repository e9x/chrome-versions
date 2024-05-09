import Database from "better-sqlite3";
import type {
  bruteforce_attempt,
  cros_brand,
  cros_build,
  cros_recovery_image_db,
  cros_target,
} from "../lib/index.js";
import { fileURLToPath } from "node:url";
import {
  insertManyTargets,
  insertManyBrands,
  insertManyBuilds,
  insertManyRecoveryImage,
  insertManyBruteforceAttempt,
  db,
} from "./dbOp.js";

// rename the older database with a bunch of constraints on the columns to crapdb.db and put it in the dist dir
// or not

// this won't be relevant after chrome-versions@1.0.5

const oldDB = new Database(
  fileURLToPath(new URL("../dist/crapdb.db", import.meta.url)),
);

insertManyTargets(
  oldDB.prepare("SELECT * FROM cros_target").all() as cros_target[],
);
insertManyBrands(
  oldDB.prepare("SELECT * FROM cros_brand").all() as cros_brand[],
);
insertManyBuilds(
  oldDB.prepare("SELECT * FROM cros_build").all() as cros_build[],
);
insertManyRecoveryImage(
  oldDB
    .prepare("SELECT * FROM cros_recovery_image")
    .all()
    .map((e: any) => {
      e.last_modified = new Date(e.last_modified).toISOString();
      return e;
    }) as cros_recovery_image_db[],
);
insertManyBruteforceAttempt(
  oldDB
    .prepare("SELECT * FROM bruteforce_attempt")
    .all() as bruteforce_attempt[],
);
